---
title: Elasticsearch
published: 2026-10-11
updated: 2026-10-11
description: 使用ES搜索引擎，加快数据查询效率
image: ''
tags: [Elasticsearch]
category: 常用工具
draft: false 
---

# 一、认识Elasticsearch（简称ES）

## 1.1 定义

Elasticsearch是由elastic公司开发的一套搜索引擎技术，它是elastic技术栈中的一部分。完整的技术栈包括：

- `Elasticsearch`：用于数据存储、计算和搜索
- `Logstash/Beats`：用于数据收集
- `Kibana`：用于数据可视化
整套技术栈被称为ELK，经常用来做日志收集、系统监控和状态分析等等

## 1.2 安装ES跟Kibana

- `elasticsearch`：存储、搜索和运算
- `kibana`：图形化展示

### Kibana简介

就是给ES提供的一个可视化图形化工具，Elasticsearch对外提供的是Restful风格的API，任何操作都可以通过发送http请求来完成，而Kibana就简化了操作。<br>

Kibana是elastic公司提供的用于操作Elasticsearch的可视化控制台。它的功能非常强大，包括：

- 对Elasticsearch数据的搜索、展示
- 对Elasticsearch数据的统计、聚合，并形成图形化报表、图形
- 对Elasticsearch的集群状态监控
- 它还提供了一个开发控制台（DevTools），在其中对Elasticsearch的Restful的API接口提供了语法提示

### ES的Docker部署

~~~Bash
docker run -d \
  --name es \ #容器名
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \ #设置内存大小，不设置默认1g
  -e "discovery.type=single-node" \
  -v es-data:/usr/share/elasticsearch/data \  #数据卷挂载
  -v es-plugins:/usr/share/elasticsearch/plugins \  #插件挂载，比如后面的IK
  --privileged \
  --network hm-net \ #docker内部容器间的网
  -p 9200:9200 \
  -p 9300:9300 \
  elasticsearch:7.12.1  # 版本
~~~

### Kibana的Docker部署

~~~Bash
docker run -d \
--name kibana \
-e ELASTICSEARCH_HOSTS=http://es:9200 \ # 访问ES的地址
--network=hm-net \
-p 5601:5601  \
kibana:7.12.1
~~~

## 1.3 倒排索引

ES采取的是倒排索引，相比于`MySQL`的正向索引，面对模糊查询就需要遍历整个数据库，倒排索引明显更快。

### 关键概念

- 文档（Document）：用来搜索的数据，其中的每一条数据就是一个文档。例如一个网页、一个商品信息
- 词条（Term）：对文档数据或用户搜索数据，利用某种算法分词，得到的具备含义的词语就是词条。例如：为祖国添砖JAVA，就可以分成，为，祖国，添砖，JAVA这些词条<br>

创建倒排索引是对正向索引的一种特殊处理和应用，流程如下：

- 将每一个文档的数据利用分词算法根据语义拆分，得到一个个词条
- 创建表，每行数据包括词条、词条所在文档id、位置等信息
- 因为词条唯一性，可以给词条创建正向索引
此时形成的这张以词条为索引的表，就是倒排索引表

>[!TIP]
这也一来，我们就有一个表，记录了词条对应的原先数据的索引

### 流程

![流程](1.png)

## 1.4 基本概念

跟`MySQL`相似，但也有差别

### 1.4.1 文档和字段

elasticsearch是面向文档（Document）存储的，可以是数据库中的一条商品数据，一个订单信息。文档数据会被序列化为json格式后存储在elasticsearch中：

~~~JSON
{
    "id": 1,
    "title": "小米手机",
    "price": 3499
}
{
    "id": 2,
    "title": "华为手机",
    "price": 4999
}
{
    "id": 3,
    "title": "华为小米充电器",
    "price": 49
}
{
    "id": 4,
    "title": "小米手环",
    "price": 299
}
~~~

可见，数据库中的一行就是这里一段JSON，也就是文档，这里就有四个文档，数据库里的一列就是这里的一个Field字段

### 1.4.2 索引和映射

- 索引：ES是通过索引，将文档进行分类存储，有点像数据库中的table表
- 映射：用来定义表的结构、字段的名称、类型等信息。因此，索引库中就有映射（mapping），是索引中文档的字段约束信息，类似表的结构约束。

>[!TIP]
`MySQL`更安全，`ES`更高效

## 1.5 IK分词器

Elasticsearch的关键就是倒排索引，而倒排索引依赖于对文档内容的分词，而分词则需要高效、精准的分词算法，IK分词器就是这样一个中文分词算法。

### 安装IK

~~~Bash
docker exec -it es ./bin/elasticsearch-plugin  install https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v7.12.1/elasticsearch-analysis-ik-7.12.1.zip
~~~

安装到es的插件挂卷处

### 使用IK分词器

- ik_smart：智能语义切分
- ik_max_word：最细粒度切分
我们在`Kibana`中的devTool使用：

~~~JSON
POST /_analyze
{
  "analyzer": "ik_smart", //这里切换模式
  "text": "学习java太棒了"
}
~~~

### 扩展词典

由于这个IK算法分词并不一定识别出网络热词或者最近的一些公司名等，这是我们就要手动添加进入词典中
![添加](2.png)

~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
        <comment>IK Analyzer 扩展配置</comment>
        <!--用户可以在这里配置自己的扩展字典 *** 添加扩展词典-->
        <entry key="ext_dict">ext.dic</entry>
</properties>
~~~

然后创建一个ext.dic的文件，里面写入自己不想拆开的词语，记得重启es容器

# 二、索引库操作

## 2.1 Mapping映射字段

Mapping是对索引库中文档的约束，常见的Mapping属性包括：

- type：字段数据类型，常见的简单类型有：
  - 字符串：text（可分词的文本）、keyword（精确值，例如：品牌、国家、ip地址）
  - 数值：long、integer、short、byte、double、float、
  - 布尔：boolean
  - 日期：date
  - 对象：object
- index：是否创建索引，默认为true
- analyzer：使用哪种分词器
- properties：该字段的子字段
这个操作就等于是对于数据库中每个字段设置类型，主键的操作

## 2.2 索引的CRUD操作

由于Elasticsearch采用的是Restful风格的API，因此其请求方式和路径相对都比较规范，而且请求参数也都采用JSON风格。
我们直接基于Kibana的DevTools来编写请求做测试

### 2.2.1 索引库的创建，Mapping映射字段

基本语法：

- 请求方式：PUT
- 请求路径：/索引库名，可以自定义
- 请求参数：mapping映射

~~~JSON
PUT /索引库名称
{
  "mappings": {
    "properties": {
      "字段名":{
        "type": "text",
        "analyzer": "ik_smart"
      },
      "字段名2":{
        "type": "keyword",
        "index": "false"
      },
      "字段名3":{
        "properties": {
          "子字段": {
            "type": "keyword"
          }
        }
      },
      // ...略
    }
  }
}
~~~

**创建索引（定义表结构），只规定字段、类型、分词器**不插入任何业务数据。

>[!NOTE]
有些字段名没有指定分词器，并不意味着不会被es查到，因为默认是es的标准分词器，只有index属性标记为false，才不会查到，因为不会生成索引

### 2.2.2 索引库查询

基本语法：

- 请求方式：GET
- 请求路径：/索引库名
- 请求参数：无
-  

~~~
GET /索引库名
~~~

### 2.2.3 索引库的删除

语法：

- 请求方式：DELETE
- 请求路径：/索引库名
- 请求参数：无
-  

~~~
DELETE /索引库名
~~~

### 2.2.4 修改索引库

由于倒排索引，我们无法修改mapping映射字段，因为每改一次就会重新分词，但是我们可以新增映射字段<br>

~~~JSON
PUT /索引库名/_mapping  //注意_mapping
{
  "properties": {
    "新字段名":{
      "type": "integer"
    }
  }
}
~~~

## 2.3 文档操作

这一步就是对上面建立的索引库中**文档**（数据）进行修改，类似于sql建表后，对里面的数据进行修改

### 2.3.1 新增文档

~~~
POST /索引库名/_doc/文档id  //这里的文档id就类似于mysql中的每一行的index
{
    "字段1": "值1",
    "字段2": "值2",
    "字段3": {
        "子属性1": "值3",
        "子属性2": "值4"
    },
}
~~~

### 2.3.2 查询文档

~~~
GET /{索引库名称}/_doc/{id}
~~~

### 2.3.3 删除文档

~~~
DELETE /{索引库名}/_doc/id值
~~~

### 2.3.4 修改文档

分为：

- 全量修改：直接覆盖原来的文档
- 局部修改：修改文档中的部分字段

#### 全量修改put

它会删除原来的文档，然后执行修改的内容

~~~
PUT /{索引库名}/_doc/文档id
{
    "字段1": "值1",
    "字段2": "值2",
    // ... 略
}
~~~

>[!NOTE]
如果id不存在，就会直接新建一个文档

#### 局部修改

不会删除，直接修改定义的部分

~~~
POST /{索引库名}/_update/文档id
{
    "doc": {
         "字段名": "新的值",
    }
}
~~~

### 2.3.5 批量处理操作

~~~JSON
POST _bulk
{ "index" : { "_index" : "test", "_id" : "1" } }
{ "field1" : "value1" }
{ "delete" : { "_index" : "test", "_id" : "2" } }
{ "create" : { "_index" : "test", "_id" : "3" } }
{ "field1" : "value3" }
{ "update" : {"_id" : "1", "_index" : "test"} }
{ "doc" : {"field2" : "value2"} }
~~~

- index代表新增操作
  - _index：指定索引库名
  - _id指定要操作的文档id
  - { "field1" : "value1" }：则是要新增的文档内容
- delete代表删除操作
  - _index：指定索引库名
  - _id指定要操作的文档id
- update代表更新操作
  - _index：指定索引库名
  - _id指定要操作的文档id
  - { "doc" : {"field2" : "value2"} }：要更新的文档字段

>[!TIP]
在devTool中对于每一个操作，变更的文档都要写在同一行，不要分行写
