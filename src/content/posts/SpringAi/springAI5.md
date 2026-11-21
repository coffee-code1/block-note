---
title: SpringAI-5(聊天对话记忆)
published: 2026-09-13
updated: 2026-11-21
description: 聊天记忆，历史存储功能
image: ''
tags: [SpringAI]
category: SpringAI
draft: false 
---

# 聊天记忆

## 1.概念区分

- 聊天记忆：大语言模型在对话过程中保留并用于维持上下文感知的信息。

- 聊天历史：完整的对话记录，包含用户与模型之间交换的所有消息。
- 短期记忆：在一个对话中AI记得你发送的消息，但是换一个对话就忘记了，受上下文窗口的约束
- 长期记忆：也叫持久化记忆，能够长期记住你发送的信息

## 2.自己手动添加对话

我们直接把AI可能会发送的回答添加到一个list中，一起发送给AI

~~~java
@GetMapping("/call1")
public String call1(String message) {

    List<Message> messages = new ArrayList<>();

    //第一轮对话
    messages.add(new SystemMessage("你是一个旅行推荐师"));

    messages.add(new UserMessage("我想去新疆玩"));
    messages.add(new AssistantMessage("好的，我知道了，你要去新疆，请问你准备什么时候去"));
    messages.add(new UserMessage("我准备元旦的时候去玩"));
    messages.add(new AssistantMessage("好的，请问你想玩那些内容？"));

    messages.add(new UserMessage("我喜欢自然风光"));

    Prompt prompt = new Prompt(messages);
    return chatModel.call(prompt).getResult().getOutput().getText();
}

~~~

如果是交互式，我们就需要根据`chatresponse`获取内容，然后添加到list集合中

~~~java

 ChatResponse chatResponse = chatModel.call(new Prompt(messages));
        String content = chatResponse.getResult().getOutput().getText();

        messages.add(new AssistantMessage(content));
~~~

但是我们可以发现这样的代码都限制了我们能够记忆的轮回数，也就是你手动添加了几次，就只能记住几次

## 3. 当前springAI提供好的记忆类型

### `MessageWindowChatMemory`

该类是springAI提供好的类，**减少了上面复杂冗长的代码**，但其本质也是通过将一次次的message添加到提示词中的<br>

 维护固定容量的消息窗口（默认 20 条）。当消息超限时，自动移除较早的对话消息（始终保留系统消息）。

~~~java
MessageWindowChatMemory memory = MessageWindowChatMemory.builder()
    .maxMessages(10)
    .build();
~~~

>[!TIP]
此类型是chatMemory默认类型，注意的是限制消息次数包含用户message以及返回的message

## 4. 记忆存储方式(持久化存储)

### 默认`InMemoryChatMemoryRepository`（不持久）

底层是基于`ConcurrentHashMap`实现的，也就是存在了内存中，但这种方式虽然是默认的，不持久

### 其它的存储类（持久）

`JdbcChatMemoryRepository`,`CassandraChatMemoryRepository`,`Neo4jChatMemoryRepository`<br>
具体用法见官方文档，比如想要存入数据库:

- 引入对应依赖
- 配置数据库文件
- 修改存储类型为`JdbcChatMemoryRepository`

~~~java
public class JdbcChatMemoryConfiguration {

    @Bean
    ChatMemory chatMemory(JdbcChatMemoryRepository chatMemoryRepository) {
        return MessageWindowChatMemory.builder().chatMemoryRepository(chatMemoryRepository).build();
    }
}

~~~

## 5. 怎么用

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
