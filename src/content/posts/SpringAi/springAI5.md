---
title: SpringAI-5
published: 2026-09-13
updated: 2026-09-13
description: 聊天记忆，历史存储功能
image: ''
tags: [SpringAI]
category: SpringAI
draft: false 
---
- [聊天记忆](#聊天记忆)
  - [1.聊天记忆跟聊天历史区分](#1聊天记忆跟聊天历史区分)
  - [2. 记忆类型](#2-记忆类型)
    - [`MessageWindowChatMemory`](#messagewindowchatmemory)
  - [3. 记忆存储](#3-记忆存储)
    - [默认`InMemoryChatMemoryRepository`](#默认inmemorychatmemoryrepository)
    - [其它的存储类](#其它的存储类)
  - [3. 怎么用](#3-怎么用)

# 聊天记忆

## 1.聊天记忆跟聊天历史区分

聊天记忆：大语言模型在对话过程中保留并用于维持上下文感知的信息。<br>

聊天历史：完整的对话记录，包含用户与模型之间交换的所有消息。

## 2. 记忆类型

### `MessageWindowChatMemory`

 维护固定容量的消息窗口（默认 20 条）。当消息超限时，自动移除较早的对话消息（始终保留系统消息）。

~~~java
MessageWindowChatMemory memory = MessageWindowChatMemory.builder()
    .maxMessages(10)
    .build();
~~~

>[!TIP]
此类型是chatMemory默认类型

## 3. 记忆存储

### 默认`InMemoryChatMemoryRepository`

底层是基于`ConcurrentHashMap`实现的

### 其它的存储类

`JdbcChatMemoryRepository`,`CassandraChatMemoryRepository`,`Neo4jChatMemoryRepository`<br>
具体用法见官方文档

## 3. 怎么用

chatCLient API 调用，通过Advisor<br>
MessageChatMemoryAdvisor：通过指定 ChatMemory 实现管理会话记忆。每次交互时从记忆库检索历史消息，并将其作为消息集合注入提示词<br>

PromptChatMemoryAdvisor：基于指定 ChatMemory 实现管理会话记忆。每次交互时从记忆库检索历史对话，并以纯文本形式追加至系统（system）提示词。<br>

VectorStoreChatMemoryAdvisor：通过指定 VectorStore 实现管理会话记忆。每次交互时从向量存储检索历史对话，并以纯文本形式追加至系统（system）消息<br>

~~~java
ChatMemory chatMemory = MessageWindowChatMemory.builder().build();

ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
    .build();
~~~

调用时每次都要传入conversationId才行：

~~~java
String conversationId = "007";

chatClient.prompt()
    .user("Do I have license to code?")
    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
    .call()
    .content();
~~~
