---
title: Redisson分布式限流器RRateLimiter
published: 2026-09-26
description: Redission提供的限流器的使用以及原理解析
tags: [Redis,RRateLimiter]
category: Redis
draft: false
---

# Redisson分布式限流器RRateLimiter

## 1.什么是分布式限流器

就是用来限制一个接口在指定时间内能接受的请求数，比如登录账号的验证码，在规定时间内只能发送一次

## 2.如何使用

### 常见方法

这里前置条件是要做好有关redis配置，然后创建RedissionClient<br>
创建限流器：

~~~java
boolean trySetRate(RateType mode, long rate, long rateInterval, RateIntervalUnit rateIntervalUnit);
~~~

>[!TIP]
三个参数分别代表模式（分成全局模式，以及单机模式，分布式一般采取全局模式）、令牌个数、限定时间、时间单位

获取限流器:

~~~java
RRateLimiter getRateLimiter(String name);

 RRateLimiter rRateLimiter = redissonClient.getRateLimiter(LIMIT_KEY_PREFIX + key);
~~~

获取令牌：

~~~java
void acquire(long permits);
boolean tryAcquire(long permits, long timeout, TimeUnit unit);
~~~

>[!TIP]
`acquire` 和 `tryAcquire` 均可用于获取指定数量的令牌，不过 `acquire` 会阻塞等待，而 `tryAcquire` 会等待 `timeout` 时间，如果仍然没有获得指定数量的令牌直接返回 false。

总结：`RRateLimiter`是一个java对象是用来装载限流器规则跟数据的，我们通过get方法获取的对象有可能是第一次，不存在规则，这个时候就需要set创建限流器配置参数。然后`tryAcquire`获取令牌<br>

### 使用实例

这里是自己封装了一个限流器，通过实现接口自定义限流器

~~~java
public class SlidingWindowRateLimiter implements RateLimiter {

    private RedissonClient redissonClient;

    //限流器的名字前缀
    private static final String LIMIT_KEY_PREFIX = "nft:turbo:limit:";

    public SlidingWindowRateLimiter(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }

    @Override
    public Boolean tryAcquire(String key, int limit, int windowSize) {
        RRateLimiter rRateLimiter = redissonClient.getRateLimiter(LIMIT_KEY_PREFIX + key);

        if (!rRateLimiter.isExists()) {
            rRateLimiter.trySetRate(RateType.OVERALL, limit, windowSize, RateIntervalUnit.SECONDS);
        }

        return rRateLimiter.tryAcquire();
    }
}
~~~

## 3.底层原理

底层是一个令牌桶原理：

- 令牌以固定速率生成。
- 生成的令牌放入令牌桶中存放，如果令牌桶满了则多余的令牌会直接丢弃，当请求到达时，会尝试从令牌桶中取令牌，取到了令牌的请求可以执行。
- 如果桶空了，那么尝试取令牌的请求会被直接丢弃。

#### 源码分析

基于Lua语句编写

##### 创建限流器

~~~Lua
redis.call('hsetnx', KEYS[1], 'rate', ARGV[1]);
redis.call('hsetnx', KEYS[1], 'interval', ARGV[2]);
return redis.call('hsetnx', KEYS[1], 'type', ARGV[3]);
~~~

##### 创建获取令牌

最后都会在`tryAcquireAsync`方法中实现

~~~java
@Override
public boolean tryAcquire() {
    return tryAcquire(1);
}

@Override
public boolean tryAcquire(long permits) {
    return get(tryAcquireAsync(RedisCommands.EVAL_NULL_BOOLEAN, permits));
}

private <T> RFuture<T> tryAcquireAsync(RedisCommand<T> command, Long value) {
    byte[] random = getServiceManager().generateIdArray();
    return commandExecutor.evalWriteAsync(getRawName(), LongCodec.INSTANCE, command,
    
           // KEYS 数组在调用 Lua 时传入了 5 个 key：

        //- KEYS [1]：限流器元数据 Hash（存 rate、interval、type）
        //- KEYS [2]：全局模式的 value key
        //- KEYS [3]：单机模式的 value key（带当前客户端唯一 ID）
        //- KEYS [4]：全局模式的 permits zset key
        //- KEYS [5]：单机模式的 permits zset key（带当前客户端唯一 ID）
            // Lua脚本开始
            "local rate = redis.call('hget', KEYS[1], 'rate');" +
            "local interval = redis.call('hget', KEYS[1], 'interval');" +
            "local type = redis.call('hget', KEYS[1], 'type');" +
            // 【关键断言】如果hash不存在，直接抛异常 RateLimiter is not initialized
            "assert(rate ~= false and interval ~= false and type ~= false, 'RateLimiter is not initialized')" +

            //- `valueName`：存放**剩余令牌数**的 Redis String key
            //- `permitsName`：ZSet 的 key，用来存每一次发放令牌的时间戳，用于过期令牌回收
            "local valueName = KEYS[2];" +
            "local permitsName = KEYS[4];" +
            "if type == '1' then " +
                "valueName = KEYS[3];" +
                "permitsName = KEYS[5];" +
            "end;" +

            //获取可用的令牌数
            "local currentValue = redis.call('get', valueName); " +
            //这个key存在，代表之前发放过令牌
            "if currentValue ~= false then " +
                -- 回收过期令牌：zset中找到时间窗口外的记录，算出要归还的令牌
                //取出当前zset根据时间戳排完序后，0到当前时间戳减去规定的时间间隔的所有令牌
                "local expiredValues = redis.call('zrangebyscore', permitsName, 0, tonumber(ARGV[2]) - interval); " +
                //初始化释放的令牌数为0
                "local released = 0; " +
                //获取过期的令牌并累加到released
                "for i, v in ipairs(expiredValues) do " +
                    "local random, permits = struct.unpack('Bc0I', v); " +
                    "released = released + permits; " +
                "end; " +
                -- 清理过期记录
                //有过期就在zset中删除这些过期的令牌，并归还到令牌桶
                "if released > 0 then " +
                //删除这些范围内的key
                    "redis.call('zremrangebyscore', permitsName, 0, tonumber(ARGV[2]) - interval); " +
                    //当前的令牌数就是剩余的加上释放的
                    "currentValue = tonumber(currentValue) + released; " +
                    //更新数据
                    "redis.call('set', valueName, currentValue);" +
                "end;" +

                -- 回收完成后，判断当前令牌够不够本次申请，如果不够返回nil空
                "if tonumber(currentValue) < tonumber(ARGV[1]) then " +
                    "return nil; " +
                "else " +
                    -- 令牌足够，扣减，写入zset记录本次申请
                    "redis.call('decrby', valueName, ARGV[1]); " +
                    "redis.call('zadd', permitsName, ARGV[2], struct.pack('Bc0I', ARGV[3], ARGV[1])); " +
                    "return 1; " +
                "end; " +
            "else " +
                -- 第一次拿令牌，初始化value和zset
                "assert(tonumber(rate) >= tonumber(ARGV[1]), 'Requested permits amount could not exceed defined rate'); " +
                "redis.call('set', valueName, rate); " +
                "redis.call('zadd', permitsName, ARGV[2], struct.pack('Bc0I', ARGV[3], ARGV[1])); " +
                "redis.call('decrby', valueName, ARGV[1]); " +
                "return 1; " +
            "end;",
            // KEYS数组
            Arrays.asList(getRawName(), getValueName(), getClientValueName(), getPermitsName(), getClientPermitsName()),
            // ARGV参数：申请令牌数、当前时间戳、随机值
            value, System.currentTimeMillis(), random);
}
~~~

总结：当请求获取指定key的令牌时，会先看key是否是第一次获取，是就初始化一个令牌桶，并记录当前调用，然后下一次再次调用就会先判断是否存在有过期的令牌（**懒加载**），有就回收到桶中，通过这个桶中剩余令牌数判断是否足够，够就扣减令牌数，不够就返回nil<br>

注意的是一定要利用set**设置参数配置**，否则就会一直报错无法进入此逻辑
