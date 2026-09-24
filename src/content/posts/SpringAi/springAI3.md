---
title: SpringAI-3
published: 2026-09-11
updated: 2026-09-11
description: prompt 提示词的基本用法以及介绍
image: ''
tags: [SpringAI]
category: SpringAI
draft: false 
---
- [提示词](#提示词)
  - [1.什么是提示词](#1什么是提示词)
  - [2.prompt类](#2prompt类)
    - [message类](#message类)
  - [3. `PromptTemplate`模板](#3-prompttemplate模板)
    - [3.1 什么是模板](#31-什么是模板)
    - [3.2 自定义模板格式](#32-自定义模板格式)
    - [3.3 `PromptTemplate`的接口实现类](#33-prompttemplate的接口实现类)
  - [4. `PromptTemplate`的基本用法](#4-prompttemplate的基本用法)
    - [4.1 常见的方法以及用法](#41-常见的方法以及用法)
      - [1.构造器](#1构造器)
      - [2.三个核心方法：render /create/createMessage](#2三个核心方法render-createcreatemessage)
    - [4.2 使用案例](#42-使用案例)
  - [`SystemPromptTemplate`专门为SystemMessage设置的模板类](#systemprompttemplate专门为systemmessage设置的模板类)

# 提示词

## 1.什么是提示词

提示词是引导 AI 模型生成特定输出的输入，其设计和措辞显著影响模型响应

## 2.prompt类

spring AI封装好的类，封装的就是提示词以及一些有关chatmodel的设置

~~~java
public class Prompt implements ModelRequest<List<Message>> {

    private final List<Message> messages;

    private ChatOptions chatOptions;
}
~~~

### message类

`Message` 是接口，代表**一条带角色（role）**的对话单元，对应大模型 Chat 接口里的 `messages` 数组里的一条记录Spring Fra...
<br>

1. **SystemMessage**：系统提示，设定 AI 角色、规则、输出格式。对话最前面，优先级最高
2. **UserMessage**：用户输入，用户提问；支持多模态（图片 + 文字）
3. **AssistantMessage**：AI 模型返回的回答，也可以携带工具调用（ToolCall）
4. **ToolResponseMessage**：工具执行结果，函数调用返回的数据

~~~java

public interface Content {

 String getContent();

 Map<String, Object> getMetadata();
}

public interface Message extends Content {

 MessageType getMessageType();
}
~~~

## 3. `PromptTemplate`模板

### 3.1 什么是模板

就是之前我们都是写好的提示词，这也我们万一想多次输入不同的提示词就不方便，我们每次都要进行设置，而我们定义一个模板，需要调整的部分设置成占位符即可

### 3.2 自定义模板格式

该类使用 `TemplateRenderer`API 渲染模板。默认情况下，Spring AI 采用基于 Terence Parr 开发的开源 `StringTemplate` 引擎的 `StTemplateRenderer` 实现。模板变量通过 {} 语法标识，但也可配置为其他分隔符语法。

~~~java
PromptTemplate promptTemplate = PromptTemplate.builder()
    .renderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .template("""
            Tell me the names of 5 movies whose soundtrack was composed by <composer>.
            """)
    .build();

String prompt = promptTemplate.render(Map.of("composer", "John Williams"));
~~~

### 3.3 `PromptTemplate`的接口实现类

- `PromptTemplateStringActions` 专注于创建和渲染提示词字符串，代表最基础的提示生成形式。体验AI工具

- `PromptTemplateMessageActions` 专为通过生成和操作 Message 对象来创建提示词而设计。

- `PromptTemplateActions` 设计用于返回 Prompt 对象，该对象可传递给 ChatModel 生成响应。

>[!TIP]
具体里面的方法这里不在展开，因为这些方法运用的频率不高，具体可查看官方文档

## 4. `PromptTemplate`的基本用法

### 4.1 常见的方法以及用法

#### 1.构造器

~~~java
// PromptTemplate
new PromptTemplate(String templateText, Map<String, Object> model)
// SystemPromptTemplate
new SystemPromptTemplate(String templateText, Map<String, Object> model)

~~~

#### 2.三个核心方法：render /create/createMessage

~~~java
String render(Map<String, Object> model)
Prompt create(Map<String, Object> model)
Message createMessage(Map<String, Object> model)
// 重载版本，额外增加模型参数ChatOptions
Prompt create(Map<String, Object> model, ChatOptions options)

~~~

### 4.2 使用案例

这里是底层API的使用，没有通过ChatClient包装

~~~java
PromptTemplate promptTemplate = new PromptTemplate("Tell me a {adjective} joke about {topic}");

Prompt prompt = promptTemplate.create(Map.of("adjective", adjective, "topic", topic));

return chatModel.call(prompt).getResult();
~~~

>[!TIP]
值得注意的是这里的create方法底层先调用了render方法进行字符串渲染，也就是替换占位符，然后再进行create返回prompt

## `SystemPromptTemplate`专门为SystemMessage设置的模板类

用法一样的，就是面向的对象不一样，之前的那个是通用版本的

~~~java
String userText = """
    Tell me about three famous pirates from the Golden Age of Piracy and why they did.
    Write at least a sentence for each pirate.
    """;

Message userMessage = new UserMessage(userText);

String systemText = """
  You are a helpful AI assistant that helps people find information.
  Your name is {name}
  You should reply to the user's request with your name and also in the style of a {voice}.
  """;

SystemPromptTemplate systemPromptTemplate = new SystemPromptTemplate(systemText);
Message systemMessage = systemPromptTemplate.createMessage(Map.of("name", name, "voice", voice));

Prompt prompt = new Prompt(List.of(userMessage, systemMessage));

List<Generation> response = chatModel.call(prompt).getResults();
~~~
