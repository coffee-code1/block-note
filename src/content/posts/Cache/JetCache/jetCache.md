---
title: JetCache
published: 2026-10-06
updated: 2026-10-06
description: 零基础学会JetCache
image: ''
tags: [Cache]
category: JetCache
draft: false 
---
# 一、定义

`JetCache` 是阿里开源的一个基于**Java** 的缓存系统封装，提供统一的API和注解来简化缓存的使用。 JetCache 提供了比 `SpringCache` 更加强大的注解，可以原生的支持 **TTL、两级缓存、分布式自动刷新**，还提供了 Cache 接口用于手工缓存操作。

## 二、使用方法

### 2.1 依赖引入

~~~xml
        <!-- jet cache-->
        <dependency>
            <groupId>com.alicp.jetcache</groupId>
            <artifactId>jetcache-starter-redis</artifactId>
            <version>2.7.0.M1</version>
        </dependency>
~~~

### 2.2 YAML配置

~~~yaml
jetcache:
  statIntervalMinutes: 1 # 设置输出日志时间，0表示关闭此功能
  areaInCacheName: false # 是否把 `area` 拼接到远程缓存 key 名称
  local:
    default:
      type: caffeine
      keyConvertor: fastjson2  #表示当地使用`Caffeine`，key序列化用fastjson2
  remote:
    default:
      type: redisson
      keyConvertor: fastjson2
      broadcastChannel: ${spring.application.name} #设置频道，当采取两层缓存时，redis改变会通知订阅此频道的模块，修改本地缓存 
      keyPrefix: ${spring.application.name}
      valueEncoder: java #value采取java原生的序列化方式
      valueDecoder: java
      defaultExpireInMillis: 5000  # 默认redis内部过期时间
      #远程使用redis
~~~

>[!TIP]
这里还需要redis的配置,password跟host,port

### 2.3 启动类注解

~~~java
@EnableMethodCache(basePackages = "包路径")
~~~

### 2.4 方案一：方法上标记注解

- `@Cached`查询方法，缓存结果；miss 自动查 DB 并回填缓存

~~~ java
@Cached(name=":user:cache:id:", key="#userId", expire=7200, cacheType=CacheType.BOTH, localExpire=600, cacheNullValue=false)
~~~

>[!TIP]
分别是名称，key的名字（spel），过期时间，缓存类型Both代表两级缓存，本地缓存过期时间，缓存为null

- `@CacheUpdate`更新缓存（直接覆盖缓存值）

~~~java
@CacheUpdate(name=":user:cache:id:", key="#user.id", value="#user")

~~~

- `@CacheInvalidate`删除缓存 key

~~~java
@CacheInvalidate(name = ":user:cache:id:", key = "#userActiveRequest.userId", beforeInvoked = false)
~~~

>[!TIP]
最后一个false代表方法成功执行完才删除对应的缓存，true则是执行前就删除

- `@CacheInvalidateAll`清空该缓存下所有 key
- `@CreateCache`注解创建`Cache`实例对象

~~~java
@CreateCache(name = ":user:cache:id:", expire = 7200, cacheType = CacheType.BOTH, syncLocal=true)
private Cache<String, User> idUserCache;
~~~

>[!TIP]
最后一个集群 BOTH 二级缓存必开，删除缓存广播清除所有实例本地 Caffeine 缓存

- `@CacheRefresh`缓存刷新

~~~java
@CacheRefresh(refresh = 60, timeUnit = TimeUnit.MINUTES)
~~~

>[!TIP]
当有请求调用时就会开启定时任务刷新，如果设置`stopRefreshAfterError = true`就会遇到异常停止，或者删除了缓存就会停止，其他情况并不会

### 2.5 方案二：手动实现缓存

#### 手动创建

对于`@CreateCache`注解创建`Cache`实例对象，我们可以借助`CacheManager` 动态创建

~~~java
   @PostConstruct
    public void init() {
        QuickConfig idQc = QuickConfig.newBuilder(":user:cache:id:")
                .cacheType(CacheType.BOTH)
                .expire(Duration.ofHours(2))
                .syncLocal(true)
                .build();
        idUserCache = cacheManager.getOrCreateCache(idQc);
    }
~~~

>[!NOTE]
 @PostConstruct代表**Bean 完成依赖注入之后，自动执行这个方法**。

`CacheManager` 常用的方法：

~~~java
// 根据缓存名称获取Cache
Cache getCache(String name);

// 根据配置新建Cache
Cache createCache(CacheConfig config);

// 获取所有缓存名称集合
Set<String> getCacheNames();

//根据配置中的key查找cache不存在就根据配置创建
<K,V> Cache<K,V> getOrCreateCache(CacheConfig<K,V> cacheConfig);

~~~

`CacheManager` 是缓存管理器，用来统一创建、查找、管理所有 `Cache` 实例；而 `Cache` 是单个缓存实例（就是你 `idUserCache`），用来做读写删的手工操作。

#### 手动增删改

- **`V get(K key)`**
查询缓存，命中返回 value；没命中返回 null。

~~~java
User user = idUserCache.get("10001");
~~~

- **`void put(K key, V value)`**
写入缓存

~~~java
idUserCache.put("10001", user);
~~~

- **`boolean remove(K key)`**
删除单个 key。

~~~java
idUserCache.remove("10001");
~~~

- **`V computeIfAbsent(K key, Function<K,V> loader)`**，**内置防缓存击穿锁**。key 存在直接返回；不存在执行 loader（查 DB），查到数据自动 put 进缓存。

~~~java
User user = idUserCache.computeIfAbsent("10001", k -> userMapper.findById(Long.valueOf(k)));
~~~

- 大写`PUT / GET / REMOVE`是另一套 API，返回`CacheResult`，可以**单独指定本次写入的 TTL**，覆盖缓存默认 expire，支持异步。

~~~java
// 单独设置过期时间
idUserCache.PUT("10001", user, 300, TimeUnit.SECONDS);
CacheResult result = idUserCache.PUT("10001", user);
CacheGetResult<User> getResult = idUserCache.GET("10001");
CacheResult removeResult = idUserCache.REMOVE("10001");
~~~

>[!TIP]
`CacheResult`里面可以判断`isSuccess()`、获取错误信息，适合需要感知缓存操作是否成功的场景。

当我们需要实现延迟双删的功能时，也就是第一次缓存删除完毕后，等待一定时间再次删除，防止脏数据，只依靠注解是无法实现的，只能通过手动实现的方式

## 三、延迟双删实现

我们在代码中定义一个延迟删除类，实现等待一定时间删除缓存

~~~java
@Service
@Slf4j
public class UserCacheDelayDeleteService {

    private static ThreadFactory userCacheDelayProcessFactory = new ThreadFactoryBuilder()
            .setNameFormat("user-cache-delay-delete-pool-%d").build();

    private ScheduledExecutorService scheduler = new ScheduledThreadPoolExecutor(10, userCacheDelayProcessFactory);

    public void delayedCacheDelete(Cache idUserCache, User user) {
        scheduler.schedule(() -> {
            boolean idDeleteResult = idUserCache.remove(user.getId().toString());
            log.info("idUserCache removed, key = {} , result  = {}", user.getId(), idDeleteResult);
        }, 2, TimeUnit.SECONDS);
    }
}
~~~

>[!TIP]
这里采取线程工厂是为了自定义线程的名称，方便排查，使用线程池是因为主线程要继续执行，不阻塞，相比新开一个线程，线程池性能更好

整个流程：

~~~java
  //第一次删除缓存
  idUserCache.remove(user.getId().toString());
  ---
  //第二次删除缓存
  userCacheDelayDeleteService.delayedCacheDelete(idUserCache, user);
~~~
