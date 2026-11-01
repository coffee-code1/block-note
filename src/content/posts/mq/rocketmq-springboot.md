---
title: springboot中的RocketMQ
published: 2026-10-31
updated: 2026-11-01
description: 带你学会如何在springBoot中使用RocketMQ
image: ''
tags: [RocketMQ]
category: SpringCloud
draft: false 
---
# 本文章中主要是4.x版本

# 一、前置基础

## 1.1 依赖引入

~~~xml
   <!-- rocketmq的依赖 -->
        <dependency>
            <groupId>org.apache.rocketmq</groupId>
            <artifactId>rocketmq-spring-boot-starter</artifactId>
            <version>2.2.2</version>
        </dependency>
~~~

## 1.2 yaml文件配置

~~~yaml
rocketmq:
  # NameServer地址，集群多个用分号分隔 127.0.0.1:9876;127.0.0.2:9876
  name-server: 127.0.0.1:9876

  producer:
    # 生产者组，同一个业务组名字保持一致，不同业务不要重名
    group: demo-producer-group
    # 发送超时时间 ms
    send-message-timeout: 3000
    # 同步发送失败重试次数
    retry-times-when-send-failed: 2
    # 异步发送失败重试次数
    retry-times-when-send-async-failed: 2
    # 失败是否尝试换其他broker发送
    retry-next-server: true
    # 消息体超过阈值压缩
    compress-message-body-threshold: 4096
    # ACL鉴权，没开ACL可以删掉这两行
    # access-key: xxx
    # secret-key: xxx

  # consumer这里yaml里只写通用配置，订阅topic/tag一般写在@RocketMQMessageListener注解上！
  consumer:
    group: demo-consumer-group
    # ACL鉴权，没开ACL删掉
    # access-key: xxx
    # secret-key: xxx

~~~

# 二、apache 官方用法

## 2.1 快速入门

我们使用`RocketMQTemplate`操作

### 2.1.1 生产者

~~~java
/**

* 注入rocketMQTemplate，我们使用它来操作mq
 */
@Autowired
private RocketMQTemplate rocketMQTemplate;

/**

* 测试发送简单的消息
*
* @throws Exception
 */
@Test
public void testSimpleMsg() throws Exception {
    // 往test的主题里面发送一个简单的字符串消息
    // syncSend同步消息
    // asyncSend异步
    // 参数1:topic名 参数2：Object，数据
    SendResult sendResult = rocketMQTemplate.syncSend("test", "我是一个简单的消息");
    // 拿到消息的发送状态
    System.out.println(sendResult.getSendStatus());
    // 拿到消息的id
    System.out.println(sendResult.getMsgId());
}

~~~

### 2.1.2 消费者监听器

~~~java
@Component
@RocketMQMessageListener(topic = "demo-topic",                     // 监听哪个topic
        consumerGroup = "demo-order-consumer-group",// 消费组，每个业务唯一！
        selectorType = SelectorType.TAG,
        selectorExpression = "TagA || TagB",      // 订阅TagA、TagB；全部消息写 "*"
        consumeMode = ConsumeMode.ORDERLY,        // ORDERLY顺序消费 / CONCURRENTLY并发（默认并发）
        messageModel = MessageModel.CLUSTERING,   // CLUSTERING集群 / BROADCASTING广播
        maxReconsumeTimes = 3  
        )                   // 最大重试次数)
public class SimpleMsgListener implements RocketMQListener<String> {
 
    /**
     * 消费消息的方法
     * 
     * @param message 消息内容，类型和上面的泛型一致。如果泛型指定了固定的类型，消息体就是我们的参数
     */
    @Override
    public void onMessage(String message) {
        System.out.println(message);
    }
}
~~~

- 这里我们是在`RocketMQMessageListener`中定义了消费者的信息，而没有在全局的yaml文件中指定，并且这里的优先级是高于yaml中的配置
- 我们定义一个实现类去实现了`RocketMQListener<T>`
- 这里的参数我们也可以指定`MessageExt`这样我们能拿到完整的数据，是 **RocketMQ 原生 SDK 里的消息对象**，继承自 `Message`。

>[!TIP]
当传输消息是对象时就将泛型设置成对象类型，如果是集合就将泛型设置成Object最后处理时进行强转

## 2.2 发送不同模式的消息

### 2.2.1 发送同步消息

- rocketMQTemplate.syncSend()
- rocketMQTemplate.send()
- rocketMQTemplate.convertAndSend()

### 2.2.2 发送异步消息

使用`- rocketMQTemplate.asyncSend()`：

~~~java
/**
 * 测试异步发送消息
 *
 * @throws Exception
 */
@Test
public void testAsyncSend() throws Exception {
    // 发送异步消息，发送完以后会有一个异步通知
    rocketMQTemplate.asyncSend("test", "发送一个异步消息", new SendCallback() {
        /**
         * 成功的回调
         * @param sendResult
         */
        @Override
        public void onSuccess(SendResult sendResult) {
            System.out.println("发送成功");
        }
 
        /**
         * 失败的回调
         * @param throwable
         */
        @Override
        public void onException(Throwable throwable) {
            System.out.println("发送失败");
        }
    });
    // 测试一下异步的效果
    System.out.println("谁先执行");
    // 挂起jvm 不让方法结束
    System.in.read();
}
~~~

### 2.2.3 发送单向消息

~~~java
/**
 * 测试单向消息
 *
 * @throws Exception
 */
@Test
public void testOnWay() throws Exception {
    // 发送单向消息，没有返回值和结果
    rocketMQTemplate.sendOneWay("test", "这是一个单向消息");
}
~~~

### 2.2.4 发送延迟消息

#### 4.x版本

~~~java
/**
 * 测试延迟消息
 *
 * @throws Exception
 */
@Test
public void testDelay() throws Exception {
    // 构建消息对象
    Message<String> message = MessageBuilder.withPayload("我是一个延迟消息").build();
    // 发送一个延时消息，延迟等级为4级，也就是30s后被监听消费
    // 参数3：连接MQ的超时时间 参数4：延迟等级
    SendResult sendResult = rocketMQTemplate.syncSend("test", message, 2000, 4);
    System.out.println(sendResult.getSendStatus());
}
~~~

#### 5.x版本

基于springboot提供的：

~~~java
/**
 * delayTime秒之后消息被消费
 */
public SendResult syncSendDelayTimeSeconds(String destination, Message<?> message, long delayTime) {
    return syncSend(destination, message, producer.getSendMsgTimeout(), delayTime, DelayMode.DELAY_SECONDS);
}

/**
 * delayTime秒之后消息被消费
 */
public SendResult syncSendDelayTimeSeconds(String destination, Object payload, long delayTime) {
    Message<?> message = MessageBuilder.withPayload(payload).build();
    return syncSend(destination, message, producer.getSendMsgTimeout(), delayTime, DelayMode.DELAY_SECONDS);
}

/**
 * delayTime毫秒之后消息被消费
 */
public SendResult syncSendDelayTimeMills(String destination, Message<?> message, long delayTime) {
    return syncSend(destination, message, producer.getSendMsgTimeout(), delayTime, DelayMode.DELAY_MILLISECONDS);
}

/**
 * delayTime毫秒之后消息被消费
 */
public SendResult syncSendDelayTimeMills(String destination, Object payload, long delayTime) {
    Message<?> message = MessageBuilder.withPayload(payload).build();//把你要发的数据包装成 Spring 标准消息载体。
    return syncSend(destination, message, producer.getSendMsgTimeout(), delayTime, DelayMode.DELAY_MILLISECONDS);
}
~~~

这里的`destination`就是`topic:tag`的格式
比如：

~~~java
 rocketMQTemplate.syncSendDelayTimeSeconds(
        "topic",
        message,
        10
);
~~~

>[!TIP]
deliverTimeMills接收的是时间戳

~~~java
// 示例1：10秒后投递（相对，用syncSendDelayTimeMills）
rocketMQTemplate.syncSendDelayTimeMills("order_topic:CancelTag", payload, 10000);

// 示例2：指定【2026-11-01 12:00:00】这个时刻投递（绝对时间戳，用这个方法）
// 先算出目标时刻的毫秒时间戳
long targetTs = LocalDateTime.of(2026,11,1,12,0,0)
        .atZone(ZoneId.systemDefault())
        .toInstant()
        .toEpochMilli();
rocketMQTemplate.syncSendDeliverTimeMills("order_topic:CancelTag", payload, targetTs);

~~~

### 2.2.5 发送顺序消息

以上的消费者都是跟普通消费者是一样的，顺序消息不一样，需要单线程消费

#### 生产者

这里我们为了将保证消息的消费有序，我们定义一个seq属性，相同的就放在同一个队列中：

~~~java
/**
 * 测试顺序消费
 * mq会根据hash的值来存放到一个队列里面去
 *
 * @throws Exception
 */
@Test
public void testOrderly() throws Exception {
    List<Order> orders = Arrays.asList(
            new Order(UUID.randomUUID().toString().substring(0, 5), "张三的下订单", null, null, null, 1),
            new Order(UUID.randomUUID().toString().substring(0, 5), "张三的发短信", null, null, null, 1),
            new Order(UUID.randomUUID().toString().substring(0, 5), "张三的物流", null, null, null, 1),
            new Order(UUID.randomUUID().toString().substring(0, 5), "张三的签收", null, null, null, 1),
 
            new Order(UUID.randomUUID().toString().substring(0, 5), "李四的下订单", null, null, null, 2),
            new Order(UUID.randomUUID().toString().substring(0, 5), "李四的发短信", null, null, null, 2),
            new Order(UUID.randomUUID().toString().substring(0, 5), "李四的物流", null, null, null, 2),
            new Order(UUID.randomUUID().toString().substring(0, 5), "李四的签收", null, null, null, 2)
    );
    // 我们控制流程为 下订单->发短信->物流->签收  hash的值为seq，也就是说 seq相同的会放在同一个队列里面，顺序消费
    orders.forEach(order -> {
        rocketMQTemplate.syncSendOrderly("test-obj", order, String.valueOf(order.getSeq()));
    });
}
~~~

>[!NOTE]
`syncSendOrderly` 是**顺序消息**发送方法，第三个参数是 **hashKey**（这里用 `order.getSeq()`），rmq内部会对这个hashKey进行取模分配队列

#### 监听器消费

~~~java
@Component
@RocketMQMessageListener(topic = "test-obj",
        consumerGroup = "test-obj-group",
        // 修改为顺序消费模式（单线程），确保同队列单线程保证了顺序
        consumeMode = ConsumeMode.ORDERLY
)
public class ObjMsgListener implements RocketMQListener<Order> {
 
    /**
     * 消费消息的方法
     * @param message
     */
    @Override
    public void onMessage(Order message) {
        System.out.println(message);
    }
}
~~~

>[!TIP]
这里的消费模式就两种`CONCURRENTLY`，`ORDERLY`默认是前者并发

### 2.2.6 发送事务消息

#### 核心方法

~~~java
public interface TransactionListener {
    // 1. 半消息发送成功后，执行本地事务
    LocalTransactionState executeLocalTransaction(Message msg, Object arg);

    // 2. 【回查方法】Broker主动回调，查询本地事务状态
    LocalTransactionState checkLocalTransaction(MessageExt msg);
}

~~~

#### 快速入门

生产者:

~~~java
/**
 * 测试事务消息
 * 默认是sync（同步的）
 * 事务消息会有确认和回查机制
 * 事务消息都会走到同一个监听回调里面，所以我们需要使用tag或者key来区分过滤
 *
 * @throws Exception
 */
@Test
public void testTrans() throws Exception {
    // 构建消息体
    Message<String> message = MessageBuilder.withPayload("这是一个事务消息").build();
    // 发送事务消息
    TransactionSendResult transaction = rocketMQTemplate.sendMessageInTransaction("test", message, "消息的参数");
    // 拿到本地事务状态
    System.out.println(transaction.getLocalTransactionState());
    // 挂起jvm，因为事务的回查需要一些时间
    System.in.read();
}
~~~

生产者端的监听器:

~~~java
/**
 * 事务消息的监听与回查
 * 类上添加注解@RocketMQTransactionListener 表示这个类是本地事务消息的监听类
 * 实现RocketMQLocalTransactionListener接口
 * 两个方法为执行本地事务，与回查本地事务
 */
@Component
@RocketMQTransactionListener(corePoolSize = 4,maximumPoolSize = 8)
public class TmMsgListener implements RocketMQLocalTransactionListener {
 
    /**
     * 执行本地事务，这里可以执行想做的业务，比如操作数据库
     *     操作成功就 return RocketMQLocalTransactionState.COMMIT;
     *     操作失败就 return RocketMQLocalTransactionState.UNKNOWN;
     * 可以使用try catch来控制成功或者失败
     * @param msg
     * @param arg
     * @return
     */
    @Override
    public RocketMQLocalTransactionState executeLocalTransaction(Message msg, Object arg) {
        // 【这里面写你的本地事务逻辑】
        // 本地事务：MySQL事务，比如新增订单、扣库存，是数据库层面的事务
        // 拿到消息参数
        System.out.println(arg);
        // 拿到消息头
        System.out.println(msg.getHeaders());
        // 执行业务
        // 返回状态 COMMIT 或者 UNKNOWN
        if (成功){
            return RocketMQLocalTransactionState.COMMIT;
        }else{
            return RocketMQLocalTransactionState.UNKNOWN;
        }        
    }
 
    /**
     * 此方法为回查方法，执行需要等待一会 
     * 回查本地事务，只有上面的执行方法返回UNKNOWN时，才执行下面的方法 默认是1min回查
     * 这里可以执行一些检查的方法
     * 如果返回COMMIT，那么本地事务就算是提交成功了，消息就会被消费者看到
     *
     * @param msg
     * @return
     */
    @Override
    public RocketMQLocalTransactionState checkLocalTransaction(Message msg) {
        System.out.println(msg);
        return RocketMQLocalTransactionState.COMMIT; //返回COMMIT消费者可以直接监听到
    }
}
~~~

#### 事务消息处理逻辑

1. 生产者发送半消息到broker，broker标记为不可投消费者看不到，返回成功给broker，收到ACK成功的信息，在`executeLocalTransaction`执行本地事务，返回状态
2. 如果返回状态为`COMMIT`，则消费者可以直接监听到
3. 如果返回状态为`ROLLBACK`，则消息发送失败，直接回滚
4. 如果返回状态为`UNKNOW`，则过一段时间走回查方法
5. 如果回查方法返回状态为`UNKNOW`或者`ROLLBACK`，则消息发送失败，直接回滚
6. 如果回查方法返回状态为`COMMIT`，则消费者可以直接监听到

>[!TIP]

- 半消息 = **已经存到 Broker，但对消费者不可见、不能被消费的消息**
- **消息不是只放在内存里，写到磁盘文件上，就算 Broker 重启、宕机，消息不会丢**。
RocketMQ 底层是 CommitLog 文件，所有消息（普通消息、半消息、重试消息）都会持久化。

消费者端的写法跟上面普通的消费者一致，不需要单独对事务消息用专门的注解方法

## 2.3 消息过滤

### 2.3.1 Tag标签

springboot中通过`Topic:Tag`的方式携带Tag，注意这里的`:`<br>
生产者：

~~~java
/**
 * 发送一个带tag的消息
 *
 * @throws Exception
 */
@Test
public void testTagMsg() throws Exception {
    // 发送一个tag为java的数据
    rocketMQTemplate.syncSend("test-tag:java", "我是一个带tag的消息");
}
~~~

消费者：

~~~java
@Component
@RocketMQMessageListener(topic = "test-tag",
        consumerGroup = "test-tag-group",
        // 注明使用tag模式
        selectorType = SelectorType.TAG,
        selectorExpression = "java||C"//这里指定你的Tag，支持`||`或运算
)
public class TagMsgListener implements RocketMQListener<String> {
 
    /**
     * 消费消息的方法
     *
     * @param message
     */
    @Override
    public void onMessage(String message) {
        System.out.println(message);
    }
}
~~~

- 模式选择Tag模式

## 2.4 Key过滤

生产者：<br>
key是放在header中的

~~~java
/**
 * 发送一个带 key 的消息，我们使用事务消息，打断点查看消息头
 *
 * @throws Exception
 */
@Test
public void testKeyMsg() throws Exception {
    // 发送一个key为spring的事务消息
    Message<String> message = MessageBuilder.withPayload("我是一个带key的消息")
            .setHeader(RocketMQHeaders.KEYS, "spring")
            .build();
    rocketMQTemplate.sendMessageInTransaction("test", message, "我是一个带key的消息");
}
~~~

>[!TIP]
这里的key就是`spring`

## 2.5 消费模式

### 2.5.1 负载均衡(`CLUSTERING`)

负载均衡模式，多个消费者交替消费同一个主题里面的消息

### 2.5.2 广播模式(`BROADCASTING`)

广播模式，每个消费者都消费一遍订阅的主题的消息

### 2.5.3 使用方式

我们在注解`@RocketMQMessageListener`中通过`messageModel =  MessageModel.`进行切换

# 三、Spring Cloud Stream用法

抽象层，屏蔽 RocketMQ/Kafka/Rabbit 底层 API，一套代码切换中间件；现在主流是函数式编程模型，是对上面官方SDK的封装

## 3.1 依赖引入

~~~xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-stream-rocketmq</artifactId>
</dependency>
~~~

## 3.2 yml配置

~~~yml
spring:
  cloud:
    stream:
      # 定义要启动的函数，分号隔开
      function:
        definition: orderConsumer;orderProducer # 这里对应的原版就是整套监听器的处理逻辑
      # rocketmq binder全局配置
      rocketmq: 
        binder: # 绑定了ip
          name-server: 127.0.0.1:9876
      bindings:
        # 命名规则：函数名-in-0 输入通道；函数名-out-0 输出通道
        orderConsumer-in-0: # 这个是生产者，一般都是0，如果函数输入参数有多个序号会增加，但一个序号都只绑定一个topic
          destination: order-topic  # topic
          group: order-consumer-group # 消费组
          content-type: application/json
        orderProducer-out-0: # 这个是消费者
          destination: order-topic
          content-type: application/json
      # 通用binding参数
      binders: # 指定了rmq
        rocketmq:
          type: rocketmq

~~~

## 3.3 生产者

### 3.3.1 StreamBridge

在任意地方都可以直接发送消,类似于`rocketMQTemplate`<br>

~~~java
@RestController
public class MsgController {
    @Autowired
    private StreamBridge streamBridge;

    @GetMapping("/send")
    public String send() {
        // 普通消息，带tag、keys
        Message<String> msg = MessageBuilder.withPayload("订单消息")
                .setHeader(RocketMQHeaders.TAGS, "pay")
                .setHeader(RocketMQHeaders.KEYS, "order_1001")
                .build();
        // 第一个参数：binding名称，对应yml里 orderProducer-out-0，topic也是yml中的，如果这里第一个参数yml没有则会临时生成一个binding
        streamBridge.send("orderProducer-out-0", msg);
        return "ok";
    }
}

~~~

### 3.3.2 supplier

自动定时发送，默认是1s:

~~~java
@Bean
public Supplier<String> orderProducer() {
    return () -> {
        System.out.println("定时发出");
        return "supplier消息";
    };
}

~~~

#### 修改定时间隔

这里是在局部的通道修改

~~~yml
spring:
  cloud:
    stream:
      bindings:
        orderProducer-out-0:
          producer:
            poller: # 修改成5s
              fixed-delay: 5
              time-unit: SECONDS

~~~

## 3.4 消费者

~~~java
@Bean
public Consumer<Message<String>> orderConsumer() {
    return msg -> {
        String payload = msg.getPayload();
        // 获取headers：tag、keys
        String tag = msg.getHeaders().get(RocketMQHeaders.TAGS, String.class);
        String keys = msg.getHeaders().get(RocketMQHeaders.KEYS, String.class);
        System.out.println("收到消息：" + payload + " tag=" + tag + " keys=" + keys);
    };
}

~~~

### 消费者端Tag过滤

~~~yml
spring:
  cloud:
    stream:
      rocketmq:
        bindings:
          orderConsumer-in-0:
            consumer:
              selector-expression: "pay||cancel"
              selector-type: TAG
~~~

## 3.5 消息流转`Function<T, R>`

它就是**消息管道中间处理器**：消费 A topic 的消息 → 你的代码处理 → 自动发给 B topic。<br>
比如订单 topic（order-in）收到订单消息，做过滤 / 转换，把支付成功的消息投递到支付 topic（pay-out）。

~~~java
@Bean
public Function<String, String> orderProcessFunc() {
    return orderJson -> {
        // 处理逻辑
        if (orderJson.contains("pay_success")) {
            return "提取支付信息：" + orderJson;
        }
        // 返回null，就不会发送下游
        return null;
    };
}

~~~

对比原版写法:

~~~java
// 原生：自己写消费，自己注入RocketMQTemplate再发
@RocketMQMessageListener(topic = "order-topic")
public class OrderConsumer implements RocketMQListener<String> {
    @Autowired
    private RocketMQTemplate template;
    @Override
    public void onMessage(String msg){
        if(msg.contains("pay_success")){
            template.send("pay-topic", "提取支付信息：" + msg);
        }
    }
}

~~~

通过这段代码我们就可以简化代码，这段代码实现了**接受消息，处理消息，转发消息**的功能<br>
记得在yml中配置function

~~~yml
spring:
  cloud:
    stream:
      function:
        definition: orderProcessFunc
      bindings:
        orderProcessFunc-in-0:
          destination: order-topic  # 从这个topic收消息
          group: order-process-group
        orderProcessFunc-out-0:
          destination: pay-topic    # 处理完自动发到这个topic

~~~

## 3.6 高级设置

~~~yml
spring:
  cloud:
    stream:
      rocketmq:
        bindings:
          demo-in-0: # 通道名
            consumer:
              # 消费模式：CLUSTERING集群（默认） / BROADCASTING广播
              message-model: CLUSTERING
              # 顺序消费开启！等价 ConsumeMode.ORDERLY
              orderly: true
              # 并发线程数
              consume-thread-max: 16
              # 重试次数
              max-retry-times: 3
              # TAG过滤
              selector-type: TAG
              selector-expression: "pay||refund"

~~~

# 四、两种方案的对比

- 我们可以发现采取Spring Cloud Stream大多都是在yml文件中提前配置好的，相比原版方法不需要再加``@RocketMQMessageListener``注解了
- 虽然方便但是却没有原版灵活，但是却可以切换不同的mq。
- stream方式不支持事务消息
