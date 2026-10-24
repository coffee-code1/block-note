---
title: 策略模式设计
published: 2026-10-24
updated: 2026-10-24
description: 带你学会策略模式是什么，快速上手
image: ''
tags: [设计模式]
category: 策略模式
draft: false 
---
# 一、什么是策略模式
一句话定义：**定义一组算法，把每个算法封装起来，让它们可以互相替换，算法的变化独立于使用算法的客户端**也就是一个工厂内部加工很多不同的商品，但是顾客在购买时只需要告诉工厂商品的名字，工厂就会给你对应的商品

# 二、三要素
## 2.1 策略接口
统一规范你要做什么，这里我们拿地图软件举个例子，我们可以定义一个接口，负责地图软件常用的操作比如:定位，推送地点等
~~~java
public interface MapService{

}
~~~
## 2.2 具体策略实现（ConcreteStrategy）
不同的实现，不同算法 / 逻辑，我们可以在这个软件中接入百度，高德等提供的API去实现对应的功能，所以我们需要单独为这些创建对应的Service，写入对应的逻辑
## 2.3 上下文/工厂
持有策略，根据条件选择用哪一个策略，客户端和具体**实现解耦**，就像是一个黑盒，负责给你对应的service去使用
~~~java
@Service
public class MapServiceFactory {

    @Autowired
    private final Map<String, MapService> MapServiceMap = new ConcurrentHashMap<String, MapService>();

    public MapService get(MapType mapType) {
        String beanName = BeanNameUtils.getBeanName(MapType.name(), "MapService");

        //组装出beanName，并从map中获取对应的bean
        MapService service = MapServiceMap.get(beanName);

        if (service != null) {
            return service;
        } else {
            throw new UnsupportedOperationException(
                    "No MapService Found With mapType : " + mapType);
        }
    }
}
~~~
这个类就可以根据传入的MapType直接返回对应的service
>[!TIP]
这里的注入，跟以往的直接注入某个类不同，这里由于是map，所以注入是spring会扫描所有实现MapService的类并且是bean，然后就会以bean的名字作为key，bean作为val存入map中