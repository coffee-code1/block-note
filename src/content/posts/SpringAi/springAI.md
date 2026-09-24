---
title: 1.SpringAI
published: 2026-08-04
updated: 2026-09-10
description: 基本定义以及chatClient，chatmodel的使用，快速入门
image: ''
tags: [SpringAI]
category: SpringAI
draft: false 
---
- [一、SpringAI定义](#一springai定义)
- [二、SpringAI快速入门](#二springai快速入门)
  - [2.1 依赖引入](#21-依赖引入)
  - [2.2 yml/properties文件配置](#22-ymlproperties文件配置)
  - [2.3 创建配置类](#23-创建配置类)
  - [2.4 注入ChatClient](#24-注入chatclient)
- [三、日志打印](#三日志打印)
  - [3.1 Advisor定义](#31-advisor定义)
  - [3.2 分类](#32-分类)
  - [3.3 代码应用](#33-代码应用)
- [四、ChatClient创建](#四chatclient创建)
  - [4.1 什么是ChatClient](#41-什么是chatclient)
  - [4.2 调用Builder自动配置](#42-调用builder自动配置)
  - [4.3 在配置类中配置](#43-在配置类中配置)
  - [4.4 openAI兼容多API端点](#44-openai兼容多api端点)
    - [含义](#含义)
    - [使用](#使用)
      - [修改配置文件](#修改配置文件)
      - [利用chatModel的mutate方法](#利用chatmodel的mutate方法)
  - [4.5 chatClient的Fluent式提示词创建](#45-chatclient的fluent式提示词创建)
    - [4.5.1 什么是fluent](#451-什么是fluent)
    - [4.5.2](#452)
      - [方法一](#方法一)
    - [方法二](#方法二)
    - [方法三](#方法三)
  - [4.6 chatClient的响应](#46-chatclient的响应)
    - [4.6.1 chatClient返回值类型](#461-chatclient返回值类型)
      - [1.返回chatResponse](#1返回chatresponse)
      - [2.返回content内容](#2返回content内容)
      - [3.返回entity实体](#3返回entity实体)
      - [定义实体](#定义实体)
    - [4.6.2 流式响应](#462-流式响应)
  - [4.7 chatclient的提示词模板](#47-chatclient的提示词模板)
    - [使用案例](#使用案例)
  - [4.8 默认参数](#48-默认参数)

# 一、SpringAI定义

Spring AI是一个旨在帮助Java开发者，特别是Spring开发者，更轻松地将**AI功能集成到企业级应用中**的**框架**。

可以把它理解为AI应用开发领域的"Spring Boot"。它借鉴了**LangChain等Python项目**的思想，但并非简单移植，而是遵循Spring框架的设计哲学，提供了一套Java开发者熟悉的、简洁且一致的编程模型

# 二、SpringAI快速入门

## 2.1 依赖引入

只要在spring脚手架中**勾选ai选项中的openAI**或者其它的依赖即可自动引入
>[!TIP]
注意的是SpringAI必须基于springboot3x，JDK要求17以及以上才行

~~~java
 <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.20</version>
    </dependency>
~~~

这里的lombok要手动引入依赖，脚手架生成的有bug

## 2.2 yml/properties文件配置

![yaml](1.png)
>[!NOTE]
这里前面是项目名字，后面的ai才是必须配置的，这里给出的是**openai形式的配置**，要配置提供**ai的url**（**本地部署的ai不需要**），**chat是专门针对与聊天功能的**，配置了**模型名称**（务必准确），**temperature**表示的是每次回答的**随机性**，最后就是**你的密钥**

## 2.3 创建配置类

可类比redission也是需要引入依赖，并且配置client配置类

~~~java
@Configuration
public class ChatClientConfig {
    @Bean
    public ChatClient chatClient(OpenAiChatModel  model) {
        return ChatClient
                .builder(model)
                .defaultSystem("你现在是动漫角色八奈见杏菜")
                .build();
    }
}
~~~

>[!NOTE]
这里配置的是**ChatClient**类，引入的OpenAi依赖，spring就会自动注入**OpenAiChatModel类**，然后在配置类里构造该类。这里的defaultSystem就是System提示词，与之对应的是user提示词，**记得加入注解注入IOC容器中**

## 2.4 注入ChatClient

~~~java
@RestController
@RequestMapping("/ai")
public class AiChatController {
    @Resource
    private ChatClient chatClient;

    @GetMapping(value = "/chat",produces = "text/html;charset=utf-8")
    public Flux<String> chat(String message) {
        return chatClient
                .prompt()
                .user(message)
                .stream()
                .content();
    }
}
~~~

>[!TIP]
这里在一个Controller使用了**ChatClient**，获取**用户提示词message**，并且**采取流式stream**，最后**content收集**，采取流式返回就是**flux<>**的类型<br>
produces = "text/html;charset=utf-8"防止生成的是乱码

# 三、日志打印

## 3.1 Advisor定义

这里直接使用SpringAI提供的Advisor即可，需要在ChatClient中配置，并且在yaml文件里设置log级别
>[!TIP]
Advisor（增强组件/顾问组件） 是Spring AI 专门给聊天对话设计的拦截器，对标 Spring AOP 切面、MVC 拦截器：
在发给大模型的请求发出前、大模型返回回答之后自动执行附加逻辑，不用你在业务 Controller 里重复写代码，给对话能力做 “外挂增强”

## 3.2 分类

![分类](2.png)
第一个是打印到**控制台**上，第二个是**会话记忆**，第三个是用于**RAG**的

## 3.3 代码应用

~~~java
@Configuration
public class ChatClientConfig {
    @Bean
    public ChatClient chatClient(OpenAiChatModel  model) {
        return ChatClient
                .builder(model)
                .defaultSystem("你现在是动漫角色八奈见杏菜")
                .defaultAdvisors(new SimpleLoggerAdvisor())
                .build();
    }
}
~~~

>[!NOTE]
这里的new后可以传入其它类型的Advisor

# 四、ChatClient创建

## 4.1 什么是ChatClient

**`ChatClient` 是建立在 `ChatModel` 之上的高层链式 API，专门给业务代码写对话用的**Spring，底层依赖于chatModel。

## 4.2 调用Builder自动配置

上面的方法是直接单独配置了chatclient写死了配置，注入的时候配置是固定的，我们也可以借助Chatclent.Builder临时配置我们所需要的chatclient

~~~java
// 以编程式创建 ChatClient实 例
ChatModel myChatModel = ... // 已由Spring Boot自动配置完成
ChatClient chatClient = ChatClient.create(myChatModel);

// 或使用 Builder 实现更精细控制
ChatClient.Builder builder = ChatClient.builder(myChatModel);
ChatClient customChatClient = builder
    .defaultSystemPrompt("You are a helpful assistant.")
    .build();
~~~

>[!TIP]
这里调用Builder需要传入ChatModel，然后可以在以链式编程的方式，添加system，user等参数

## 4.3 在配置类中配置

这里就是在单独自定义的一个**全局**的chatClient类并注册为bean，一般用于多模型使用，也就是每一个不一样的chatModel我们都进行一个ChatClientBean定义

~~~java
@Configuration
public class ChatClientConfig {

    @Bean
    public ChatClient openAiChatClient(OpenAiChatModel chatModel) {
        return ChatClient.create(chatModel);
    }

    @Bean
    public ChatClient anthropicChatClient(AnthropicChatModel chatModel) {
        return ChatClient.create(chatModel);
    }
}
~~~

>[!TIP]
但是这样create的方式，无法在创建bean时就进行system，user的设置，只能在注入时利用promote（）后临时加上，但并不是全局的

如果想在bean时就设置，那么可以调用builder的方式进行设定

~~~java
@Configuration
public class ChatClientConfig {
    @Bean
    public ChatClient chatClient(OpenAiChatModel  model) {
        return ChatClient
                .builder(model)
                .defaultSystem("你现在是动漫角色八奈见杏菜")
                .build();
    }
}
~~~

随后可通过 @Qualifier 注解将这些 Bean 注入应用组件：

~~~java
   @Qualifier("openAiChatClient") ChatClient openAiChatClient,
    @Qualifier("anthropicChatClient") ChatClient anthropicChatClient
~~~

## 4.4 openAI兼容多API端点

### 含义

大致就是，openAI设置的一套规范标准，现在多数的大模型厂商都兼容这套标准，所以通过openAI这套标准就可以调用其它大模型，这也使得它兼容多API。

### 使用

#### 修改配置文件

当我们是通过openAI的标准调用大模型，并且想要修改调用key或者是其它大模型时，我们可以直接改配置文件

#### 利用chatModel的mutate方法

只有openAI相关的类才包含此方法

~~~java
public void multiClientFlow() {
            // Derive a new OpenAiApi for Groq (Llama3)
            OpenAiApi groqApi = baseOpenAiApi.mutate()
                .baseUrl("https://api.groq.com/openai")
                .apiKey(System.getenv("GROQ_API_KEY"))
                .build();

            // Derive a new OpenAiApi for OpenAI GPT-4
            OpenAiApi gpt4Api = baseOpenAiApi.mutate()
                .baseUrl("https://api.openai.com")
                .apiKey(System.getenv("OPENAI_API_KEY"))
                .build();

            // Derive a new OpenAiChatModel for Groq
            OpenAiChatModel groqModel = baseChatModel.mutate()
                .openAiApi(groqApi)
                .defaultOptions(OpenAiChatOptions.builder().model("llama3-70b-8192").temperature(0.5).build())
                .build();

            // Derive a new OpenAiChatModel for GPT-4
            OpenAiChatModel gpt4Model = baseChatModel.mutate()
                .openAiApi(gpt4Api)
                .defaultOptions(OpenAiChatOptions.builder().model("gpt-4").temperature(0.7).build())
                .build();

            // Simple prompt for both models
            String prompt = "What is the capital of France?";

            String groqResponse = ChatClient.builder(groqModel).build().prompt(prompt).call().content();
            String gpt4Response = ChatClient.builder(gpt4Model).build().prompt(prompt).call().content();
     }
~~~

## 4.5 chatClient的Fluent式提示词创建

### 4.5.1 什么是fluent

就是链式编程的意思

### 4.5.2

提供了promote()三种重载方法

#### 方法一

prompt()：无参方法启动 Fluent 式API，支持逐步构建用户消息、系统消息等提示词组件。

### 方法二

prompt(Prompt prompt)：接收 Prompt 参数，支持通过非 Fluent 式 API 构建的 Prompt 实例。
>[!TIP]
这里的prompt参数就是一个封装类

~~~java
public class Prompt {
    private List<Message> messages;
    private ChatOptions options;
}

~~~

而这里的ChatOptions又是一个类，封装的模型，随机性等参数

### 方法三

prompt(String content)：便捷方法，接收用户文本内容，功能类似前项重载。<br>

当我们调用无参方法时，在参加system，user，options底层就会创建成一个Prompt类返回

## 4.6 chatClient的响应

### 4.6.1 chatClient返回值类型

#### 1.返回chatResponse

这个类里包含元数据，元数据数组，以及损耗的token

~~~java
ChatResponse chatResponse = chatClient.prompt()
    .user("Tell me a joke")
    .call()
    .chatResponse();
~~~

#### 2.返回content内容

~~~java
ChatResponse chatResponse = chatClient.prompt()
    .user("Tell me a joke")
    .call()
    .content();
~~~

直接返回数据本身，抛去了token等内容

#### 3.返回entity实体

这个就是按照自定义的entity实体进行返回，首先需要自定义一个实体

#### 定义实体

我们可以新建一个实体类，进行属性成员定义，一定要有**getter，setter方法**，同时我们也可以采取java16+引进的语法糖record

~~~java
record ActorFilms(String actor, List<String> movies) {}
~~~

帮我们创建好了setter跟getter等方法
>[!WARNING]
访问方法不是 getXXX ()，直接是字段名 `actor()`、`movies()`

这样我们就可以这样调用:

~~~java
ActorFilms actorFilms = chatClient.prompt()
    .user("Generate the filmography for a random actor.")
    .call()
    .entity(ActorFilms.class);
~~~

另提供 entity 重载方法 entity(ParameterizedTypeReference<T> type)，支持泛型集合等复杂类型指定：

~~~java
List<ActorFilms> actorFilms = chatClient.prompt()
    .user("Generate the filmography of 5 movies for Tom Hanks and Bill Murray.")
    .call()
    .entity(new ParameterizedTypeReference<List<ActorFilms>>() {});
~~~

### 4.6.2 流式响应

stream()是流式响应，也就是分开一步步返回，相对应的就是call()的阻塞时响应，也就是等全部结束后统一返回

~~~java
Flux<String> output = chatClient.prompt()
    .user("Tell me a joke")
    .stream()
    .content();
~~~

也可以将content设置成chatreponse类型返回

## 4.7 chatclient的提示词模板

我们可以采取以下方式，进行提示词占位

~~~java
String answer = ChatClient.create(chatModel).prompt()
    .user(u -> u
            .text("Tell me the names of 5 movies whose soundtrack was composed by {composer}")
            .param("composer", "John Williams"))
    .call()
    .content();
~~~

我们发现spring ai中默认的模板占位符是‘{’，我们可以自定义这个模板

~~~java
String answer = ChatClient.create(chatModel).prompt()
    .user(u -> u
            .text("Tell me the names of 5 movies whose soundtrack was composed by <composer>")
            .param("composer", "John Williams"))
    .templateRenderer(StTemplateRenderer.builder().startDelimiterToken('<').endDelimiterToken('>').build())
    .call()
    .content();
~~~

### 使用案例

~~~java
@Configuration
class Config {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder.defaultSystem("You are a friendly chat bot that answers question in the voice of a {voice}")
                .build();
    }

}
~~~

~~~java
@RestController
class AIController {
 private final ChatClient chatClient;

 AIController(ChatClient chatClient) {
  this.chatClient = chatClient;
 }

 @GetMapping("/ai")
 Map<String, String> completion(@RequestParam(value = "message", defaultValue = "Tell me a joke") String message, String voice) {
  return Map.of("completion",
    this.chatClient.prompt()
      .system(sp -> sp.param("voice", voice))
      .user(message)
      .call()
      .content());
 }

}
~~~

## 4.8 默认参数

比如defaultSystem（）等，我们在注入chatclient时如果不设置system就会采取默认的设置，我们也可以添加system进行覆盖。
