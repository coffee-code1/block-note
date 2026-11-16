---
title: XXL-JOB
published: 2026-11-03
updated: 2026-11-15
description: 带你快速入门分布式任务调度工具
image: ''
tags: [常用工具]
category: XXL-JOB
draft: false 
---
# 一、什么是XXL-JOB

它是一个任务调度工具，就是一个可以在固定周期内执行你所规定的功能的工具，比如我们在购物时的24h自动关单功能

# 二、快速入门

整体分为：**部署调度中心（xxl-job-admin）→ 业务项目接入执行器 → 开发任务 Handler → 后台配置执行器 + 任务 → 测试运行**G

## 2.1 准备 & 初始化数据库

- 下载源码：[https://gitee.com/xuxueli0323/xxl-job](https://gitee.com/xuxueli0323/xxl-job)
- 在 MySQL 新建库，执行 `doc/db/tables_xxl_job.sql`，生成 8 张核心表
- 修改 `xxl-job-admin` 的 `application.yml`：数据库地址、账号密码

## 2.2 启动任务调度中心

1. 启动 `XxlJobAdminApplication`
2. 访问：`http://127.0.0.1:8080/xxl-job-admin`
   - 默认账号：`admin` / `123456`

## 2.3 项目接入

### 2.3.1 依赖引入

~~~xml
<dependency>
    <groupId>com.xuxueli</groupId>
    <artifactId>xxl-job-core</artifactId>
    <version>2.4.1</version>
</dependency>

~~~

### 2.3.2 yml配置

~~~yml
xxl:
  job:
    admin:
      addresses: http://127.0.0.1:8080/xxl-job-admin #任务调度的ip地址
    executor:
      appname: demo-executor # 执行器唯一标识
      address: # 执行器对外访问地址，一般留空（自动注册）
      ip: # 执行器注册 IP，一般留空
      port: 9999 # 执行器内嵌服务端口，默认 9999
      logpath: /data/applogs/xxl-job/jobhandler # 日志输出位置
      logretentiondays: 30 # 日志存留时间
    accessToken: default_token #通信令牌，admin 和所有执行器必须完全一致，防止随意调用执行器

~~~

### 2.3.2 配置类，注册执行器 Bean

#### 方式一

~~~java
@Configuration
public class XxlJobConfig {
    @Value("${xxl.job.admin.addresses}")
    private String adminAddresses;
    @Value("${xxl.job.executor.appname}")
    private String appName;
    @Value("${xxl.job.executor.port}")
    private int port;
    @Value("${xxl.job.accessToken}")
    private String accessToken;
    @Value("${xxl.job.executor.logpath}")
    private String logPath;
    @Value("${xxl.job.executor.logretentiondays}")
    private int logRetentionDays;

    @Bean
    public XxlJobSpringExecutor xxlJobExecutor() {
        XxlJobSpringExecutor executor = new XxlJobSpringExecutor();
        executor.setAdminAddresses(adminAddresses);
        executor.setAppname(appName);
        executor.setPort(port);
        executor.setAccessToken(accessToken);
        executor.setLogPath(logPath);
        executor.setLogRetentionDays(logRetentionDays);
        return executor;
    }
}

~~~

#### 方式二

先定义一个接受配置的类：

~~~java
ConfigurationProperties(prefix = XxlJobProperties.PREFIX)
public class XxlJobProperties {

    public static final String PREFIX = "spring.xxl.job";

    private String adminAddresses;

    private String accessToken;

    private String appName;

    private String ip;

    private int port;

    private String logPath;

    private int logRetentionDays = 30;
}
~~~

创建配置类，注入该类：

~~~java
@Configuration
@EnableConfigurationProperties(XxlJobProperties.class)
public class XxlJobConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(XxlJobConfiguration.class);

    @Autowired
    private XxlJobProperties properties;

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = XxlJobProperties.PREFIX)
    public XxlJobSpringExecutor xxlJobExecutor() {
        logger.info(">>>>>>>>>>> xxl-job config init.");
        XxlJobSpringExecutor xxlJobSpringExecutor = new XxlJobSpringExecutor();
        xxlJobSpringExecutor.setAdminAddresses(properties.getAdminAddresses());
        xxlJobSpringExecutor.setAppname(properties.getAppName());
        xxlJobSpringExecutor.setIp(properties.getIp());
        xxlJobSpringExecutor.setPort(properties.getPort());
        xxlJobSpringExecutor.setAccessToken(properties.getAccessToken());
        xxlJobSpringExecutor.setLogPath(properties.getLogPath());
        xxlJobSpringExecutor.setLogRetentionDays(properties.getLogRetentionDays());
        return xxlJobSpringExecutor;
    }
}

~~~

采取这样的方式，我们可以写入springboot的自动依赖注入的文件里，方便其它模块直接使用

### 2.3.3 编写任务 Handler

~~~java
@Component
public class DemoTask {
    @XxlJob("demoJobHandler") // 这个名字后台要填对
    public ReturnT<String> demoJobHandler(String param) {
        XxlJobLogger.log("任务执行，参数：{}", param);
        // 业务逻辑
        return ReturnT.SUCCESS;
    }
}

~~~

# 三、后台配置

1. **执行器管理 → 新增执行器**
   - AppName：和配置里 `demo-executor` 一致
   - 注册方式：自动注册（推荐），保存
   - 启动你的 SpringBoot
2. **任务管理 → 新增任务**
   - 执行器：选中上面新建的
   - JobHandler：`demoJob`（和注解名字完全一致）
   - 调度类型：Cron，例如 `0 0 2 * * ?` 代表每天凌晨 2 点
   - 路由策略：轮询 / 第一个 / 分片广播
   - 阻塞策略：单机串行（最常用）
3. 保存 → **启动**；可以点【执行一次】立刻测试
4. 在【调度日志】看执行记录、查看运行日志
