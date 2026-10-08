---
title: MapStruct
published: 2026-10-08
updated: 2026-10-08
description: 快速掌握MapStruct的基本用法，以及原理
image: ''
tags: [MapStruct]
category: MapStruct
draft: false 
---
# 一、什么是MapStruct

MapStruct 是一个代码生成器，基于约定而非配置方法，大大简化了 Java 各个类型间映射的实现。

# 二、怎么使用

## 2.1 依赖引入

~~~xmal
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.6.3</version>
</dependency>
~~~

>[!WARNING]
当有Lombock引入时需要额外添加lombok-mapstruct-binding到Path中防止出错

## 2.2 快速使用

### 2..1 创建当前接口实例

创建完实现类就可以在别的地方直接使用这些实现类，然后调用你自定义的方法即可

#### 1.非spring环境

通过getMapper的方式获取当前类的实现类

~~~java
public interface UserConvertor {

    UserConvertor INSTANCE = Mappers.getMapper(UserConvertor.class);
}
~~~

`INSTANCE`就是创建好的实现类，默认是`Public static final`

#### 2.spring环境

~~~java
@Mapper(componentModel = "spring") // 当 componentModel 设置为 spring 时，生成的实现类上会添加 @Component 注解
public interface UserConverter {

}
~~~

这也就可以直接注入该类使用了

### 2.2.2 自定义实现类里的方法

~~~java
 @Mapping(target = "userId", source = "request.id")
 @Mapping(target = "createTime", source = "request.gmtCreate")
 public UserInfo mapToVo(User request);
~~~

这里的注解不是Mybites中的，target代表拷贝目的对象的字段，source代表拷贝来源，当拷贝间字段名不一致时需要这也进行定义<br>

如果多个字段都不一致，我们也可以利用`@Mappings`来实现

~~~java
@Mappings(
    @Mapping(target = "userId", source = "request.id"),
    @Mapping(target = "createTime", source = "request.gmtCreate")
)
public UserInfo mapToVo(User request);
~~~

### 2.2.3 自定义转化方式

我们通过default方法，规定我们自定义的转化逻辑，利用`Name`注解标记规则名称，然后在`@Mapping`中的`qualifiedByName`字段名引入规则即可

~~~java
@Mapper
public interface UserConvertor {
    UserConvertor INSTANCE = Mappers.getMapper(UserConvertor.class);

    // 核心转换方法
    @Mapping(target = "userId", source = "id")
    @Mapping(target = "createTime", source = "gmtCreate")
    // 使用qualifiedByName 指定调用下面自定义方法
    @Mapping(target = "statusDesc", source = "status", qualifiedByName = "statusToChinese")
    UserInfo mapToVo(User request);

    // 自定义转换：数字状态码 → 中文描述
    @Named("statusToChinese")
    default String statusToChinese(Integer status) {
        if (status == null) return "未知";
        return switch (status) {
            case 0 -> "禁用";
            case 1 -> "正常";
            default -> "未知";
        };
    }
}

~~~

# 三、原理

## 3.1 编译期

1. javac 编译器启动，加载注解处理器 `mapstruct-processor`（就是 pom 里配置的 APT 处理器）
2. 扫描源码中所有带`@Mapper`注解的接口（例如`UserConvertor`）
3. 解析接口里所有转换方法、`@Mapping`注解：
   - 拿到源类、目标类信息
   - 读取字段映射关系（`target`/`source`）
   - 识别自定义方法：`default`方法、`uses`工具类、`@BeforeMapping/@AfterMapping`
4. **自动生成实现类源码**：`UserConvertorImpl`，放在`target/generated-sources/annotations`目录下
   - 里面就是普通 Java 代码，直接调用 getter、setter 赋值，没有任何反射
5. javac 继续编译这个自动生成的 Impl 类，编译成 class 文件打包进 jar

### （拓展）APT是什么

#### 1. 定义

**APT = Annotation Processing Tool，Java 注解处理器**，是 `javac`（Java 编译器）自带的一套**编译期插件机制**。
>[!NOTE]
也就是它可以在编译器正式编译成字节码之前，根据注解修改源码，然后再进行编译，与反射不同，反射是程序运行时

#### 2. 应用实例

`Lombock`:引入其后，被它相关注解标记的类，都会在编译器编译前，自动生成get，set等方法。<br>

`MapStruct 的 mapstruct-processor`：
扫描所有带`@Mapper`的接口，读取`@Mapping`注解，**生成 Impl 实现类的 java 源码**

### 3. 如何注册给java

在path中加入，`annotationProcessorPaths`代表不会被编译打包进入

~~~xml
<annotationProcessorPaths>
    <path>lombok</path>
    <path>mapstruct-processor</path>
    <path>lombok-mapstruct-binding</path>
</annotationProcessorPaths>
~~~

或者也可以通过依赖引入，但是要加入生效范围，防止增加打包后的无效体积

~~~xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok-mapstruct-binding</artifactId>
    <version>0.2.0</version>
    <scope>annotationProcessor</scope>
</dependency>

~~~

## 3.2 运行期

spring注入方式：

~~~java
@AutoWired
private UserConvertor userconvertor
UserInfo vo = userconvertor.mapToVo(user);
~~~

非spring方式：

~~~java
UserInfo vo = UserConvertor.INSTANCE.mapToVo(user);
~~~

- `Mappers.getMapper(UserConvertor.class)` 去加载**编译好的`UserConvertorImpl`类，new 出实例**
- 调用`mapToVo`，执行里面手写的 get/set 赋值
- **全程没有反射、没有动态代理**
