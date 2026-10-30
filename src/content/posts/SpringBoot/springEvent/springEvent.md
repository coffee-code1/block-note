---
title: Spring Event
published: 2026-10-27
updated: 2026-10-28
description: 零基础学会SpringEvent的基础用法
image: ''
tags: [常用工具]
category: SpringEvent
draft: false 
---
# 一、定义

Spring Event 是 Spring 内置的**事件驱动、发布订阅模型**，底层是**观察者模式**，用来解耦业务代码：发布方只负责发事件，不用关心谁去处理；新增、删除处理逻辑只需要增减监听器，不用改动主流程代码

# 二、角色分类

1. **事件 Event**：承载数据，可以是继承 `ApplicationEvent` 的类，也可以是普通 POJO，代表一个动作 / 状态变更（用户注册、订单创建）
2. **发布者 Publisher**：`ApplicationEventPublisher`（ApplicationContext 实现了它），调用 `publishEvent()` 发出事件
3. **监听器 Listener**：消费事件，两种写法
   - 实现 `ApplicationListener<T>` 接口
   - 注解 `@EventListener`（主流写法）
  
>[!TIP]
关于Event可以是POJO的定义，是新版4.2+优化的

# 三、快速入门

## 3.1 创建Event

老版本的写法:

~~~java
public class OrderCreateEvent extends ApplicationEvent {

    public OrderCreateEvent(TradeOrder tradeOrder) {
        super(tradeOrder);
    }
}
~~~

新版本的写法:

~~~java
// 用户注册事件
@Data
@AllArgsConstructor
public class UserRegisterEvent {
    private Long userId;
    private String username;
}
~~~

## 3.2 发布事件

~~~java
 @Autowired
    protected ApplicationContext applicationContext;

 applicationContext.publishEvent(new OrderCreateEvent(tradeOrder));
~~~

对应POJO的写法:

~~~java
// 主业务：保存用户
        UserRegisterEvent event = new UserRegisterEvent(1001L, "test");
        // 发布事件
        publisher.publishEvent(event);
~~~

## 3.3 监听事件

注解:

~~~java
@EventListener
    public void onRegister(UserRegisterEvent event){
        System.out.println("监听用户注册：" + event.getUsername());
        // 发短信、积分、日志
    }
~~~

实现监听接口:

~~~java
@Component
    public class Listener implements        ApplicationListener<UserRegisterEvent> {
         @Override
         public void onApplicationEvent(UserRegisterEvent event) {}
     }
~~~

# 四、事务监听（@TransactionalEventListener）

我们上面说的EventListener如果是在事务里监听，则执行时事务并未提交，如果执行中需要查询数据库的话，则刚刚插入的数据会由于事务未提交而查询不到。这个时候就需要`@TransactionalEventListener`

## 4.1 @TransactionalEventListener绑定阶段

- `AFTER_COMMIT`（默认）：事务成功提交后才执行（最常用）
- `AFTER_ROLLBACK`：事务回滚后执行
- `AFTER_COMPLETION`：事务完成（提交 / 回滚都执行）
- `BEFORE_COMMIT`：事务提交前执行

## 4.2 使用

~~~java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void afterCommitHandle(UserRegisterEvent event){
    // 事务提交后执行，适合发送通知、调用第三方
}

~~~

# 五、事务监听的同步与异步

默认是同步，也就是和发布者一个线程，在发布者发布事件后必须等待所有的监听器跑完才会继续往下执行

## 5.1 实现异步方案

### 5.1.1 全局配置

我们定义一个配置类:

~~~java

@Configuration
public class SpringEventAsyncConfig {

    /**
     * 配置事件广播器的线程池
     * Bean名称固定：applicationEventMulticaster，Spring会自动拾取这个Bean作为广播器
     */
    @Bean
    public SimpleApplicationEventMulticaster applicationEventMulticaster(TaskExecutor eventTaskExecutor) {
        SimpleApplicationEventMulticaster multicaster = new SimpleApplicationEventMulticaster();
        // 注入线程池，开启全局异步广播
        multicaster.setTaskExecutor(eventTaskExecutor);
        // 可选：设置异常处理器，捕获监听器抛出的异常
        multicaster.setErrorHandler(t -> {
            // 自定义异常处理，告警、日志
            System.err.println("事件监听器异常：" + t.getMessage());
            t.printStackTrace();
        });
        return multicaster;
    }

    /**
     * 事件广播专用线程池
     */
    @Bean
    public TaskExecutor eventTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("event-mc-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
~~~

>[!TIP] `@Bean` 标注的方法，它的入参，Spring 会自动去容器里**按类型找 Bean**，给你传进来。
>
### 5.1.2 @Async注解（局部）

#### 1.启动类加上注解

~~~java
@SpringBootApplication
@EnableAsync
public class App {
}

~~~

#### 2.自定义线程池

~~~java
@Bean("blindBoxListenExecutor")
public TaskExecutor blindBoxListenExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(3);
    executor.setMaxPoolSize(6);
    executor.setQueueCapacity(200);
    executor.setThreadNamePrefix("blind-box-listen-");
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
    executor.initialize();
    return executor;
}

~~~

#### 3.监听器`@Async`指定线程池

~~~java
@EventListener(BlindBoxOpenEvent.class)
@Async("blindBoxListenExecutor")
public void onEvent(BlindBoxOpenEvent event){
    // 单独这个监听器异步执行
}

~~~

>[!TIP]
这样的好处就是可以指定不同的线程池

这里EventListener可以加上监听的事件类

~~~java
// 同时监听两个事件，方法参数写Object
@EventListener({BlindBoxOpenEvent.class, BlindBoxCloseEvent.class})
public void listen(Object event){}
~~~
