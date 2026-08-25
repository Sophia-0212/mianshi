@[TOC](DOM事件流)

## 目录

- [1. 常用事件绑定方式](#1-常用事件绑定方式)
  - [1.1 对象属性绑定](#11-对象属性绑定)
  - [1.2 addEventListener()绑定](#12-addeventlistener绑定)
  - [1.3 两种方式区别](#13-两种方式区别)
- [2. 事件流](#2-事件流)
  - [2.1 概念](#21-概念)
  - [2.2 事件顺序](#22-事件顺序)
    - [2.2.1 捕获阶段](#221-捕获阶段)
    - [2.2.2 目标阶段](#222-目标阶段)
    - [2.2.3 冒泡阶段](#223-冒泡阶段)
- [3. 阻止事件冒泡](#3-阻止事件冒泡)
  - [3.1 event.stopPropagation()](#31-eventstoppropagation)
  - [3.2 stopPropagation与stopImmediatePropagation区别](#32-stoppropagation与stopimmediatepropagation区别)
- [4. 事件流实战](#4-事件流实战)
- [事件委托](#事件委托)

# 1. 常用事件绑定方式
## 1.1 对象属性绑定

```javascript
<button id="btn">点我</button>
<script>
  var btn = document.getElementById("btn");
  btn.onclick = function() {
    console.log("事件触发")
  }
</script>
```
## 1.2 addEventListener()绑定

```javascript
<button id="btn">点我</button>
<script>
  var btn = document.getElementById("btn");
  btn.addEventListener("click", function () { 
    console.log("事件触发");
  });
</script>
```

> `addEventListener`第三个参数，`Boolean`类型值，可指定事件冒泡阶段还是捕获阶段触发，`true`-捕获，`false`-冒泡，默认`false`，既冒泡。

## 1.3 两种方式区别

 - 对象属性绑定方式只能绑定一次，重复绑定同一事件类型，前面的会被后面的覆盖

> 下面代码中，“事件触发-1”不会执行了，被下面的`onclick`覆盖了
其实这种类似对象属性，同一个key，重新赋值会覆盖前面的值

```javascript
<button id="btn">点我</button>
<script>
  var btn = document.getElementById("btn");
  btn.onclick = function() {
    console.log("事件触发-1")
  }
  btn.onclick = function() {
    console.log("事件触发-2")
  }
</script>
```
`addEventListener`没有重复绑定覆盖的问题，同一元素可以绑定同一事件类型多次

> 下面代码中，按钮点击时，事件会依次触发

```javascript
<button id="btn">点我</button>
<script>
  var btn = document.getElementById("btn");
  btn.addEventListener("click", function () { 
    console.log("事件触发-1");
  });
  btn.addEventListener("click", function () { 
    console.log("事件触发-2");
  });
  btn.addEventListener("click", function () { 
    console.log("事件触发-3");
  });
</script>
```

# 2. 事件流

## 2.1 概念
事件发生时会在元素节点与根节点之间按照特定的顺序传播，路径所经过的所有节点都会收到该事件，这个传播过程即`DOM`事件流。
## 2.2 事件顺序

```javascript
<div id="root">
  <button id="btn">点我</button>
</div>
```

### 2.2.1 捕获阶段
在页面中点击`button`，首先`document`接收到`click`事件，然后沿着`dom`树，依次向下，直到实际事件触发元素，既`button`节点，这一过程称为事件捕获过程，是从外到内的传播过程。

### 2.2.2 目标阶段
经过事件捕获阶段后，然后是实际目标接收到事件即处于目标阶段

### 2.2.3 冒泡阶段
从目标元素，沿着`dom`树，逐级向上传递，直到`document`对象
下图是事件流模型，记为 `洋葱模型`(先外到内，再内到外)

![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/403adf7aecf006cf44e3aeecb07bf71d.png)

历史背景不讲了，总结以下几点：

 1. 默认情况下浏览器以事件冒泡形式进行事件传播
 2. 一刀插过洋葱，先外到内，再内到外，既事件流先由最外层`document`捕获到目标元素，再经目标元素冒泡到`document`
 3. 如果要触发捕获阶段事件，在上面介绍的方法`addEventListener`设置第三个参数为`false`即可




# 3. 阻止事件冒泡
## 3.1 event.stopPropagation()
有时父元素和其子元素都绑定了同一类型事件，我们不想让事件向上传播，触发哪个元素的事件，就执行那个元素的事件处理，不干扰其他元素事件。
这时就需要阻止事件冒泡

> 方法：`event.stopPropagation()`

```javascript
<div id="root">
   <button id="btn">点我</button>
</div>
<script>
  var root = document.getElementById("root");
  var btn = document.getElementById("btn");
  btn.addEventListener("click", function (event) { 
    event.stopPropagation();
    console.log("btn-事件触发");
  });
  root.addEventListener("click", function () { 
    console.log("root-事件触发");
  });
</script>
```

上面的代码中，`root`的`click`事件不会触发了。

## 3.2 stopPropagation与stopImmediatePropagation区别
相同点

> 都能阻止事件冒泡



不同点

> stopImmediatePropagation()阻止事件冒泡并且阻止该元素上同事件类型的监听器被触发

举例

1、stopPropagation只能单纯的阻止冒泡


```javascript
<div id="root">
   <button id="btn">点我</button>
</div>
<script>
  var root = document.getElementById("root");
  var btn = document.getElementById("btn");
  btn.addEventListener("click", function (event) { 
    event.stopPropagation();
    console.log("btn-事件触发1");
  });
  btn.addEventListener("click", function () { 
    console.log("btn-事件触发2");
  });
  root.addEventListener("click", function () { 
    console.log("root-事件触发");
  });
</script>
```
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/8fd799a797ef3db2ddf5f0b1bebd9975.png)
2、stopImmediatePropagation 阻止后面同类型事件触发

```javascript
<div id="root">
   <button id="btn">点我</button>
</div>
<script>
  var root = document.getElementById("root");
  var btn = document.getElementById("btn");
  btn.addEventListener("click", function (event) { 
    event.stopImmediatePropagation();
    console.log("btn-事件触发1");
  });
  btn.addEventListener("click", function () { 
    console.log("btn-事件触发2");
  });
  root.addEventListener("click", function () { 
    console.log("root-事件触发");
  });
</script>
```
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/d3cedbc2698d05af175352f843ca5ace.png)

> 注意`stopImmediatePropagation`，只能阻止`后面`事件不触发
下面代码中，只有”btn-事件触发3“不执行

```javascript
<div id="root">
   <button id="btn">点我</button>
</div>
<script>
  var root = document.getElementById("root");
  var btn = document.getElementById("btn");
  btn.addEventListener("click", function () {
    console.log("btn-事件触发1");
  });
  btn.addEventListener("click", function (event) {
    event.stopImmediatePropagation();
    console.log("btn-事件触发2");
  });
  btn.addEventListener("click", function () {
    console.log("btn-事件触发3");
  });
  root.addEventListener("click", function () {
    console.log("root-事件触发");
  });
</script>
```
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/c11ce47cf6c53f3a9ca792f7418bb7d3.png)
# 4. 事件流实战

```javascript
<div id="root">
  <button id="btn">点我</button>
</div>
<script>
  var root = document.getElementById("root");
  var btn = document.getElementById("btn");
  document.addEventListener(
    "click",
    function () {
      console.log("document-捕获");
    },
    true
  );
  document.addEventListener("click", function () {
    console.log("document-冒泡");
  });
  root.addEventListener(
    "click",
    function () {
      console.log("root-捕获");
    },
    true
  );
  root.addEventListener("click", function () {
    console.log("root-冒泡");
  });
  btn.addEventListener(
    "click",
    function () {
      console.log("btn-捕获");
    },
    true
  );
  btn.addEventListener("click", function () {
    console.log("btn-冒泡");
  });
</script>
```
![在这里插入图片描述](https://i-blog.csdnimg.cn/blog_migrate/c324d7a66e7799fa5a277f663817fb05.png)
完


# 事件委托

事件委托（Event Delegation）：
事件委托是一种常用的**优化技术**，通过将**事件处理程序添加到父元素而不是每个子元素**上，来**减少事件处理程序的数量**。当子元素触发事件时，事件会**冒泡到父元素**，然后通过**判断事件的目标元素**(target)来执行相应的处理逻辑。

例如，假设有一个ul元素包含了多个li元素，每个li元素都需要绑定点击事件。传统的做法是为每个li元素都绑定一个事件处理程序，而使用事件委托，可以将事件处理程序添加到ul元素上，然后根据事件的目标元素（即被点击的li元素）来执行对应的操作。这样可以避免为每个li元素都绑定事件处理程序，提高性能和代码的简洁性。

事件委托的优点包括**减少内存消耗、简化代码逻辑、方便动态添加或删除元素**等。
