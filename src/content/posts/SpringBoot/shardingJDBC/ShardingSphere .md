---
title: ShardingSphere
published: 2026-10-29
updated: 2026-10-29
description: 带你掌握ShardingSphere的基础用法
image: ''
tags: [常用工具]
category: ShardingSphere
draft: false 
---
# 一、定义

Apache ShardingSphere 的客户端组件，**轻量级分库分表中间件**，以 jar 包嵌入 Java 应用，直连数据库，没有独立代理服务，是增强版 JDBC 驱动Apache Sha...。

# 二、特性

1. **客户端内运行，无单独服务**，不需要部署代理，性能损耗低；仅 Java 可用
2. **兼容 JDBC 全生态**：MyBatis、SpringJdbcTemplate、Druid/HikariCP、MySQL/Oracle/PG 等
3. 业务代码几乎不用改 SQL，只配置分片规则，对业务低侵入

# 三、快速入门

## 3.1 依赖引入

~~~xml
<!-- shardingsphere-jdbc 5.x -->
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>shardingsphere-jdbc-core-spring-boot-starter</artifactId>
    <version>5.4.1</version>
</dependency>

~~~

## 3.2 配置文件配置(ShardingSphere-JDBC 5.x)

极简版:

~~~yaml
spring:
  shardingsphere:
    datasource:
      names: ds0,ds1 # 表示只用两个数据库
      ds0:
        type: com.alibaba.druid.pool.DruidDataSource #数据库连接池
        driver-class-name: com.mysql.cj.jdbc.Driver #mysql8驱动
        url: jdbc:mysql://127.0.0.1:3306/db0 #本地该数据库源地址
        username: root # 数据库用户名
        password: 123456 # 数据库密码
      ds1:
        type: com.alibaba.druid.pool.DruidDataSource
        driver-class-name: com.mysql.cj.jdbc.Driver
        url: jdbc:mysql://127.0.0.1:3306/db1
        username: root
        password: 123456
    rules:
      sharding:
        tables:
          t_order:
            actual-data-nodes: ds$->{0..1}.t_order_$->{0..1} # 数据节点，描述所有真实物理表,ds0.t_order_0, ds0.t_order_1, ds1.t_order_0, ds1.t_order_1
            key-generate-strategy: # 分布式主键生成策略
              column: order_id # 主键字段
              key-generator-name: snowflake # 雪花生成全局唯一order_id
            database-strategy: # 分库策略，判断是分到ds0还是ds1
              standard: # 标准模式，只能分一个字段
                sharding-column: user_id # 根据user_id分库
                sharding-algorithm-name: user-mod # 分库算法决定是分哪个库
            table-strategy: # 分完库之后分表策略
              standard: # 标准模式，只能根据一个字段
                sharding-column: order_id # 根据此字段分表
                sharding-algorithm-name: order-mod # 根据此算法计算如何分表
        sharding-algorithms: # 分库分表的算法
          user-mod:
            type: MOD # 采用取模的方式
            props:
              sharding-count: 2 # 对2进行取模
          order-mod:
            type: MOD
            props:
              sharding-count: 2
        key-generators: 
          snowflake:
            type: SNOWFLAKE # 这里定义了一个雪花算法生成器实例snowflake，然后定义为SNOWFLAKE在上面引用它
~~~

正常项目中的使用案例:

~~~yaml
spring:
  shardingsphere:
    rules:
      sharding:
        tables:
          # 逻辑表1：交易主订单表
          trade_order:
            # 数据节点：ds库下 trade_order_0000 ~ trade_order_0003，一共4张真实表
            actual-data-nodes: ds.trade_order_000${0..3}
            # 主键生成策略
            keyGenerateStrategy:
              column: id               # 主键字段是 id
              keyGeneratorName: snowflake # 引用下方snowflake雪花生成器
            # 分表策略（只有分表，没有database-strategy，代表不分库）
            table-strategy:
              complex:                 # 复合分片：支持多个分片键
                shardingColumns: buyer_id,order_id # 参与分片的两个字段：买家ID + 订单ID
                shardingAlgorithmName: trade-order-sharding # 引用自定义分片算法

          # 逻辑表2：订单流水/流表
          trade_order_stream:
            actual-data-nodes: ds.trade_order_stream_000${0..3} # 4张流水物理表
            keyGenerateStrategy:
              column: id
              keyGeneratorName: snowflake
            table-strategy:
              complex:
                shardingColumns: buyer_id,order_id
                shardingAlgorithmName: trade-order-sharding
            # ✅ 重点：order主表和stream流水表【共用一套分片规则、同一个分片算法、相同分片键】
            # 这就是绑定表的设计思想：相同路由规则，关联查询不会跨分片

        # 分片算法定义
        shardingAlgorithms:
          trade-order-sharding:
            type: CLASS_BASED    # 自定义Java类分片算法
            props:
              # 自定义算法全类名
              algorithmClassName: cn.example.order.infrastructure.sharding.algorithm.TurboKeyShardingAlgorithm
              strategy: complex  # 对应复合分片，代码要实现 ComplexKeysShardingAlgorithm
              tableCount: 4      # 表总数4张：0/1/2/3，自定义key
              mainColumn: buyer_id # 自定义算法读取这个配置，主分片字段 buyer_id，自定义key

        # 分布式主键生成器
        keyGenerators:
          snowflake:
            type: SNOWFLAKE     # 使用shardingsphere内置雪花算法，生成全局唯一id，给两张表的id字段共用

        # 审计器（生产防护，非常关键）
        auditors:
          sharding_key_required_auditor:
            type: DML_SHARDING_CONDITIONS

~~~

大致流程就是比如我们要对订单表进行分表，我们想要分成四个订单表，那么我们就要在数据库中真实的创建四个表，然后执行sql语句时如果携带了Order_id这个分表字段就会根据分表的算法进行计算，最后修改sql中的表为最终的分到的表的位置

>[!TIP]
分的表必须是真实的，自己要创建好，比如Order是逻辑表，Order_01,Order_02必须要创建

# 四、自定义算法

~~~java
public class TurboKeyShardingAlgorithm implements ComplexKeysShardingAlgorithm<String>{
    //获取yaml中的配置
    private Properties props;

    private static final String PROP_MAIN_COLUM = "mainColumn";

    private static final String PROP_TABLE_COUNT = "tableCount";
    //会自动调用该方法将配置文件中的数据读取到props中
    @Override
    public void init(Properties props) {
        this.props = props;
    }

    @Override
    public Collection<String> doSharding(Collection<String> availableTargetNames, ComplexKeysShardingValue<String> complexKeysShardingValue) {
        Collection<String> result = new HashSet<>();

        //props存储yaml文件的配置，获取分表的主键字段
        String mainColum = props.getProperty(PROP_MAIN_COLUM);
        // 获取分片键的值
        Collection<String> mainColums = complexKeysShardingValue.getColumnNameAndShardingValuesMap().get(mainColum);

        //这里优先是buy_id进行分表
        if (CollectionUtils.isNotEmpty(mainColums)) {
            for (String colum : mainColums) {
                String shardingTarget = calculateShardingTarget(colum);
                result.add(shardingTarget);
            }
            return getMatchedTables(result, availableTargetNames);
        }

        //如果buy_id为空，则使用其他分片键进行分表
        complexKeysShardingValue.getColumnNameAndShardingValuesMap().remove(mainColum);
        Collection<String> otherColums = complexKeysShardingValue.getColumnNameAndShardingValuesMap().keySet();
        if (CollectionUtils.isNotEmpty(otherColums)) {
            for (String colum : otherColums) {
                Collection<String> otherColumValues = complexKeysShardingValue.getColumnNameAndShardingValuesMap().get(colum); 
                for (String value : otherColumValues) {
                    String shardingTarget = extractShardingTarget(value);
                    result.add(shardingTarget);
                }
            }
            return getMatchedTables(result, availableTargetNames);
        }

        return null;
    }

}

   //自定义的获取分表的结果DistributeID.getShardingTable
    private String extractShardingTarget(String orderId) {
        return DistributeID.getShardingTable(orderId);
    }

    private String calculateShardingTarget(String buyerId) {
        String tableCount = props.getProperty(PROP_TABLE_COUNT);
        return DistributeID.getShardingTable(buyerId, Integer.parseInt(tableCount));
    }
~~~

>[!TIP]
如果实现的是stand也就是只对一个字段进行分库分表依据，则应该实现`StandardShardingAlgorithm`
