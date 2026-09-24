---
title: Maven
published: 2026-09-20
updated: 2026-09-20
description: Maven在分布式中的应用
image: ''
tags: [Maven]
category: Maven
draft: false 
---
- [Maven在微服务中的使用](#maven在微服务中的使用)
  - [父工程](#父工程)
  - [当前模块声明](#当前模块声明)
  - [当前模块的依赖配置](#当前模块的依赖配置)
    - [dependence标签](#dependence标签)
    - [build标签](#build标签)

# Maven在微服务中的使用

以下是getway模块下的pom文件配置

~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>cn.hollis</groupId>
        <artifactId>NFTurbo</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>

    <groupId>cn.hollis</groupId>
    <artifactId>nft-turbo-gateway</artifactId>
    <version>1.0.0-SNAPSHOT</version>

    <properties>
        <application.name>nfturbo-gateway</application.name>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>

        <!--  限流组件  -->
        <dependency>
            <groupId>cn.hollis</groupId>
            <artifactId>nft-turbo-limiter</artifactId>
            <exclusions>
            <!--  排除spring-web，gateway应用中不能包含spring mvc组件-->
                <exclusion>
                    <groupId> org.springframework</groupId>
                    <artifactId>spring-web</artifactId>
                </exclusion>
                <exclusion>
                    <groupId> org.springframework</groupId>
                    <artifactId>spring-webmvc</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>cn.hollis</groupId>
            <artifactId>nft-turbo-config</artifactId>
        </dependency>

        <!-- Sa-Token 权限认证 -->
        <dependency>
            <groupId>cn.dev33</groupId>
            <artifactId>sa-token-reactor-spring-boot3-starter</artifactId>
            <version>1.37.0</version>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-web</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <!-- Sa-Token 整合 Redis （使用 jackson 序列化方式） -->
        <dependency>
            <groupId>cn.dev33</groupId>
            <artifactId>sa-token-redis-jackson</artifactId>
            <version>1.37.0</version>
        </dependency>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-pool2</artifactId>
        </dependency>

        <!--Spring Cloud Loadbalancer-->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-loadbalancer</artifactId>
        </dependency>

        <!--Spring Cloud Gateway-->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-gateway</artifactId>
        </dependency>

        <!--    sensitive    -->
        <dependency>
            <groupId>com.github.houbb</groupId>
            <artifactId>sensitive-logback</artifactId>
            <version>1.7.0</version>
        </dependency>

    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
<!--                    <skip>true</skip>-->
                    <mainClass>cn.hollis.nft.turbo.gateway.NfTurboGatewayApplication</mainClass>
                </configuration>

                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>repackage</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

        </plugins>
    </build>

</project>
~~~

## 父工程

这里就是parent标签所写的，整体继承父工程项目

~~~xml
 <parent>
        <groupId>cn.hollis</groupId>
        <artifactId>NFTurbo</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>
~~~

## 当前模块声明

以下是当前模块的位置声明

~~~xml
<groupId>cn.hollis</groupId>
    <artifactId>nft-turbo-gateway</artifactId>
    <version>1.0.0-SNAPSHOT</version>
~~~

## 当前模块的依赖配置

~~~xml
  <properties>
        <application.name>nfturbo-gateway</application.name>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>

        <!--  限流组件  -->
        <dependency>
            <groupId>cn.hollis</groupId>
            <artifactId>nft-turbo-limiter</artifactId>
            <exclusions>
            <!--  排除spring-web，gateway应用中不能包含spring mvc组件-->
                <exclusion>
                    <groupId> org.springframework</groupId>
                    <artifactId>spring-web</artifactId>
                </exclusion>
                <exclusion>
                    <groupId> org.springframework</groupId>
                    <artifactId>spring-webmvc</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <dependency>
            <groupId>cn.hollis</groupId>
            <artifactId>nft-turbo-config</artifactId>
        </dependency>

        <!-- Sa-Token 权限认证 -->
        <dependency>
            <groupId>cn.dev33</groupId>
            <artifactId>sa-token-reactor-spring-boot3-starter</artifactId>
            <version>1.37.0</version>
            <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-web</artifactId>
                </exclusion>
            </exclusions>
        </dependency>

        <!-- Sa-Token 整合 Redis （使用 jackson 序列化方式） -->
        <dependency>
            <groupId>cn.dev33</groupId>
            <artifactId>sa-token-redis-jackson</artifactId>
            <version>1.37.0</version>
        </dependency>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-pool2</artifactId>
        </dependency>

        <!--Spring Cloud Loadbalancer-->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-loadbalancer</artifactId>
        </dependency>

        <!--Spring Cloud Gateway-->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-gateway</artifactId>
        </dependency>

        <!--    sensitive    -->
        <dependency>
            <groupId>com.github.houbb</groupId>
            <artifactId>sensitive-logback</artifactId>
            <version>1.7.0</version>
        </dependency>

    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
<!--                    <skip>true</skip>-->
                    <mainClass>cn.hollis.nft.turbo.gateway.NfTurboGatewayApplication</mainClass>
                </configuration>

                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>repackage</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

        </plugins>
    </build>
~~~

### dependence标签

就是用来配置所需要的依赖的，由于依赖的传递，所以我们可能有时不想多引入依赖就可以利用以下的办法：

~~~xml
 <exclusions>
                <exclusion>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-starter-web</artifactId>
                </exclusion>
            </exclusions>
~~~

### build标签

这是用来配置插件使用的

- `<configuration>`：**插件参数**（给插件的配置项）
- `<executions>`：**执行任务绑定**，用来绑定 maven 生命周期阶段(phase标签)、指定 goal（repackage，表示重新打包，打包进依赖）
就算删掉`<configuration>`，`<executions>`依旧保留，`mvn package`依然触发 repackage。
