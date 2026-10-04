---
title: Annotation 注解
published: 2026-09-24
updated: 2026-09-24
description: 学会如何在spingboot框架中自定义注解
image: ''
tags: [SpringBoot]
category: Annotation
draft: false 
---
- [注解(Annotation)](#注解annotation)
  - [一、基本概念](#一基本概念)
    - [1.1 定义](#11-定义)
    - [1.2 分类](#12-分类)
    - [① 内置基础注解](#-内置基础注解)
    - [② 元注解（用来**修饰注解本身**，`@Target @Retention`）](#-元注解用来修饰注解本身target-retention)
    - [③ 自定义注解](#-自定义注解)
  - [二、用法](#二用法)
    - [2.1 内置注解](#21-内置注解)
    - [2.2 元注解](#22-元注解)
      - [`Target`使用](#target使用)
      - [`Retention`使用](#retention使用)
      - [`Constraint`使用](#constraint使用)
    - [2.3 自定义注解](#23-自定义注解)
  - [三、反射的应用](#三反射的应用)

# 注解(Annotation)

## 一、基本概念

### 1.1 定义

注解就是附加在类、方法、变量、参数上面的「标记 / 元数据」，本身不直接执行代码，给程序（编译器 / JVM / 框架）看的额外信息。

### 1.2 分类

### ① 内置基础注解

- `@Override`：标记重写方法 → **编译器看**，检查是否真的重写父类方法
- `@SuppressWarnings`：压制警告
- `@Deprecated`：标记过时方法

>
> 这类大多生命周期是`SOURCE`，编译完就丢掉，运行时不存在。

### ② 元注解（用来**修饰注解本身**，`@Target @Retention`）

元注解 = **注解的注解**，用来定义自定义注解的规则

- `@Target`：这个注解能贴在哪（类 / 方法 / 字段）
- `@Retention`：注解保留到哪个阶段（SOURCE / CLASS / RUNTIME）
- `@Documented`：生成 javadoc 时保留这个注解
- `@Inherited`：子类自动继承父类上的该注解
- `@Constraint`：声明需要进行校验

### ③ 自定义注解

用`public @interface`定义。

>
> 如果设置`@Retention(RetentionPolicy.RUNTIME)`，**运行时可以用反射读到这个标记**，然后写业务逻辑（AOP、SpEL 解析、缓存、权限）。

## 二、用法

### 2.1 内置注解

简单来说内置注解比如`@Override`，直接写在代码上即可

~~~java
@Override
public void HelloWord(){
    System.out.println("你好，世界！！！");
}
~~~

### 2.2 元注解

元注解就是用来**定义注解**用的，它们不同于内置注解，不会在方法上或者其它地方直接使用
<br>
`@Override`这个注解底层就是通过元注解修饰的

~~~java
@Target(ElementType.METHOD)  // 只能标注在方法
@Retention(RetentionPolicy.SOURCE)
public @interface Override {
}
~~~

>[!NOTE]
`Target`表示该注解的适用范围，`ElementType`是一个枚举类型，里面有`METHOD`方法等范围，`Retention`表示注解生效阶段，`Source`就表示在源码有效，编译后消失。

#### `Target`使用

是一个枚举类

~~~java
public enum ElementType {
    // 类、接口、枚举、记录（TYPE）
    TYPE,
    // 成员变量 / 字段（包括static变量）
    FIELD,
    // 普通方法（不是构造方法），@Override用的就是这个
    METHOD,
    // 方法的形参
    PARAMETER,
    // 构造器
    CONSTRUCTOR,
    // 局部变量（方法内部定义的变量）
    LOCAL_VARIABLE,
    // 注解类型本身（注解上贴注解，也就是元注解）
    ANNOTATION_TYPE,
    // 包
    PACKAGE,
    // Java8新增：泛型参数 <T> 的T上面
    TYPE_PARAMETER,
    // Java8新增：泛型使用的地方，比如 List<String>
    TYPE_USE,
    // Java9新增：模块 module-info.java
    MODULE,
    // Java16新增：记录的组件 record
    RECORD_COMPONENT
}

~~~

其中`TYPE`,`METHOD`,`FIELD`,`PARAMETER`比较常用<br>

1. `TYPE`：类、接口、enum。比如`@Service`、`@Component`
2. `FIELD`：成员变量。`@Autowired`写在字段上就是这个
3. `METHOD`：普通方法。`@Override`、`@Transactional`（方法上）
4. `PARAMETER`：方法参数。`@RequestParam`

>[!TIP]
此注解，也可以指定多个，如果在没有此元注解，则表示该被修饰的注解适用范围是所有

~~~java
// 注解既能贴类上，也能贴方法上
@Target({ElementType.TYPE, ElementType.METHOD})
~~~

#### `Retention`使用

也是枚举类

~~~java
public enum RetentionPolicy {
    /**
     * 仅源码阶段有效，编译成class文件直接丢弃
     */
    SOURCE,
    /**
     * 保留到class字节码文件，JVM加载类时不载入内存，运行时反射取不到（默认策略）
     */
    CLASS,
    /**
     * 保留到运行期，JVM加载后还在内存，可以通过反射读取注解
     */
    RUNTIME
}
~~~

 **SOURCE**
只存在`.java`源码里，编译后删掉。
例子：`@Override`、`@SuppressWarnings`、Lombok 注解`@Data`

>
> 作用对象：**编译器**

 **CLASS（默认值，不写 @Retention 就用这个）**
写入`.class`字节码，但 JVM 加载类的时候不会把注解加载进内存，**反射拿不到**。

>
> 多用于编译期字节码增强（很少手写），默认就是这个

 **RUNTIME**
编译进 class，类加载后注解保留在内存，**运行时反射可以获取**。
例子：`@Component`、`@Transactional`、自定义`@MyLog`、`@Cacheable`

>
> Spring AOP、自定义注解、权限控制**必须用 RUNTIME**

#### `Constraint`使用

需要自定义一个校验的规则，规则写在后面的类

~~~java
@Constraint(validatedBy = MobileValidator.class)
~~~

### 2.3 自定义注解

新建一个@interfance类，并且利用元注解指定适用范围以及生效阶段等，可以在该注解内部加上属性等

~~~java
// 元注解：只能贴方法上 + 运行时可反射读取
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface MyLog {
    // 注解属性，带默认值
    String value() default "";
    String desc() default "默认描述";
}
~~~

## 三、反射的应用

只要Retention设置成RUNTIME我们就可以通过反射的机制获取，此注解以及内部的成员属性<br>

硬编码直接获取

~~~java
// 获取方法
        Method method = Test.class.getDeclaredMethod("queryUser");
        // 判断是否有注解
        if(method.isAnnotationPresent(MyLog.class)){
            MyLog myLog = method.getAnnotation(MyLog.class);
            System.out.println(myLog.value());
            System.out.println(myLog.desc());
        }
~~~

通过AOP机制获取

~~~java
// 切面通知
@Around("切入点表达式")
public Object around(JoinPoint joinPoint) throws Throwable {
    // 获取当前拦截到的方法签名
    Signature signature = joinPoint.getSignature();
    MethodSignature methodSignature = (MethodSignature) signature;
    // 拿到Method对象！
    Method method = methodSignature.getMethod();
    // 这里的method 和上面getDeclaredMethod拿到的是**同一种对象**
     MyLog myLog = method.getAnnotation(MyLog.class);
    System.out.println(myLog.value());
    System.out.println(myLog.desc());
    return joinPoint.proceed();
}
~~~
