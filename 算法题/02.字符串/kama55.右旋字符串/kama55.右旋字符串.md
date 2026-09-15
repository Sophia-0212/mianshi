# kama55. 右旋字符串

**题目描述**

给定一个字符串 `s` 和一个正整数 `k`，将字符串中的字符向右旋转 `k` 位。即将字符串后 `k` 位字符移动到字符串的前面。要求不申请额外的数组空间，只能在字符串上进行原地操作。

```
示例：
输入: s = "abcdefg", k = 2
输出: "fgabcde"

解释：
最后 2 位 "fg" 移动到最前面，剩下的 "abcde" 跟在后面。
```

## 思路

先令 `k %= n`。

- 三步反转：依次反转整体、前 `k` 位、后 `n-k` 位，将 `AB` 变为 `BA`。时间 O(n)；可变数组辅助空间 O(1)，Python/Go 转换字符串需 O(n)。
- 切片拼接：后 `k` 位拼到前面。时间 O(n)，空间 O(n)。



## Python

### LeetCode 写法与原有示例

标准库一行解（切片直接拼接，`s[-k:]` 是最后 k 位，`s[:-k]` 是前 n-k 位）：

```python
# 依赖说明：len：Python 内置函数：返回容器中元素的数量。

class Solution:
    # 方法：rightRotate；按题目要求处理输入并返回结果，核心算法见方法体。
    def rightRotate(self, s: str, k: int) -> str:
        k %= len(s)  # 防止 k 大于字符串长度导致切片异常
        return s[-k:] + s[:-k] if k else s  # 后k位拼到前面；k=0时切片s[-0:]会出错，需特判
```


手写实现（面试考察点：还原三步反转法。Python字符串不可变，转list模拟原地操作）：

```python
# 依赖说明：len：Python 内置函数：返回容器中元素的数量。

class Solution:
    # 方法：rightRotate；按题目要求处理输入并返回结果，核心算法见方法体。
    def rightRotate(self, s: str, k: int) -> str:
        arr = list(s)
        n = len(arr)
        k %= n  # 防止 k 大于字符串长度

        self._reverse(arr, 0, n - 1)  # 第一步：整体反转
        self._reverse(arr, 0, k - 1)  # 第二步：反转前k位，恢复出B段
        self._reverse(arr, k, n - 1)  # 第三步：反转后n-k位，恢复出A段
        return ''.join(arr)

    # 方法：_reverse；按题目要求处理输入并返回结果，核心算法见方法体。
    def _reverse(self, arr: list[str], left: int, right: int) -> None:
        while left < right:  # 344题双指针反转模板
            arr[left], arr[right] = arr[right], arr[left]
            left += 1
            right -= 1
```

### 面试普通函数写法（可直接运行）

保存为 `main.py`，执行 `python3 main.py`。下面是完整独立程序，包含 3 组真实输入，并打印期望结果和实际结果。

```python
from __future__ import annotations
from collections import deque, Counter, defaultdict
from typing import Optional, List

# 依赖说明：Python 内置 future 特性：annotations 让类型标注延迟解析。；Python 标准库 collections：deque 是双端队列，Counter 是计数器，defaultdict 是带默认值的字典。；Python 标准库 typing：Optional、List 等只用于类型标注。；len：Python 内置函数：返回容器中元素的数量。

# 普通函数：保留题目的核心算法，不依赖 Solution 或在线判题平台。
# 方法：rightRotate；按题目要求处理输入并返回结果，核心算法见方法体。
def rightRotate(s: str, k: int) -> str:
    arr = list(s)
    n = len(arr)
    k %= n  # 防止 k 大于字符串长度

    _reverse(arr, 0, n - 1)  # 第一步：整体反转
    _reverse(arr, 0, k - 1)  # 第二步：反转前k位，恢复出B段
    _reverse(arr, k, n - 1)  # 第三步：反转后n-k位，恢复出A段
    return ''.join(arr)

# 方法：_reverse；按题目要求处理输入并返回结果，核心算法见方法体。
def _reverse(arr: list[str], left: int, right: int) -> None:
    while left < right:  # 344题双指针反转模板
        arr[left], arr[right] = arr[right], arr[left]
        left += 1
        right -= 1


if __name__ == "__main__":
    # 用例 1：输入 ('abcdefg', 2)；期望 'fgabcde'。
    arg0 = 'abcdefg'
    arg1 = 2
    result = rightRotate(arg0, arg1)
    expected = 'fgabcde'
    print("用例 1: 期望=", expected, "实际=", result)
    assert result == expected

    # 用例 2：输入 ('abc', 1)；期望 'cab'。
    arg0 = 'abc'
    arg1 = 1
    result = rightRotate(arg0, arg1)
    expected = 'cab'
    print("用例 2: 期望=", expected, "实际=", result)
    assert result == expected

    # 用例 3：输入 ('a', 0)；期望 'a'。
    arg0 = 'a'
    arg1 = 0
    result = rightRotate(arg0, arg1)
    expected = 'a'
    print("用例 3: 期望=", expected, "实际=", result)
    assert result == expected
```

## Go

### LeetCode 写法与原有示例

```go
// 方法：rightRotate；按题目要求处理输入并返回结果，核心算法见方法体。
func rightRotate(s string, k int) string {
    arr := []byte(s)
    n := len(arr)
    k %= n // 防止 k 大于字符串长度

    reverse(arr, 0, n-1) // 第一步：整体反转
    reverse(arr, 0, k-1) // 第二步：反转前k位，恢复出B段
    reverse(arr, k, n-1) // 第三步：反转后n-k位，恢复出A段
    return string(arr)
}

// 反转 [left, right] 区间（344题双指针反转模板）
// 方法：reverse；按题目要求处理输入并返回结果，核心算法见方法体。
func reverse(arr []byte, left, right int) {
    for left < right {
        arr[left], arr[right] = arr[right], arr[left]
        left++
        right--
    }
}
```

### 面试普通函数写法（可直接运行）

保存为 `main.go`，执行 `go run main.go`。下面是完整独立程序，包含 3 组真实输入，并打印期望结果和实际结果。

```go
// 依赖说明：Go 标准库 encoding/json：JSON 编码和解码。；Go 标准库 fmt：格式化输出和输入。
package main

import (
    "encoding/json"
    "fmt"
)

// 普通函数和题目中的核心算法。
// 方法：rightRotate；按题目要求处理输入并返回结果，核心算法见方法体。
func rightRotate(s string, k int) string {
    arr := []byte(s)
    n := len(arr)
    k %= n // 防止 k 大于字符串长度

    reverse(arr, 0, n-1) // 第一步：整体反转
    reverse(arr, 0, k-1) // 第二步：反转前k位，恢复出B段
    reverse(arr, k, n-1) // 第三步：反转后n-k位，恢复出A段
    return string(arr)
}

// 反转 [left, right] 区间（344题双指针反转模板）
// 方法：reverse；按题目要求处理输入并返回结果，核心算法见方法体。
func reverse(arr []byte, left, right int) {
    for left < right {
        arr[left], arr[right] = arr[right], arr[left]
        left++
        right--
    }
}

func main() {
    // 用例 1：输入 ('abcdefg', 2)；期望 'fgabcde'。
    {
        arg0 := "abcdefg"
        arg1 := 2
        result := rightRotate(arg0, arg1)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 1: 期望=\"fgabcde\" 实际=", string(data))
    }
    // 用例 2：输入 ('abc', 1)；期望 'cab'。
    {
        arg0 := "abc"
        arg1 := 1
        result := rightRotate(arg0, arg1)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 2: 期望=\"cab\" 实际=", string(data))
    }
    // 用例 3：输入 ('a', 0)；期望 'a'。
    {
        arg0 := "a"
        arg1 := 0
        result := rightRotate(arg0, arg1)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 3: 期望=\"a\" 实际=", string(data))
    }
}
```

## C++

### LeetCode 写法与原有示例

```cpp
// 依赖说明：string：C++ STL 字符串类型。

class Solution {
public:
    // 方法：rightRotate；按题目要求处理输入并返回结果，核心算法见方法体。
    string rightRotate(string s, int k) {
        int n = s.size();
        reverse(s.begin(), s.end());        // 第一步：整体反转，AB -> reverse(B)+reverse(A)
        reverse(s.begin(), s.begin() + k);  // 第二步：反转前k位，恢复出B
        reverse(s.begin() + k, s.end());    // 第三步：反转后n-k位，恢复出A
        return s;  // 最终结果为 B + A，即右旋k位后的字符串
    }
};```

### 面试普通函数写法（可直接运行）

保存为 `main.cpp`，执行 `c++ -std=c++17 main.cpp -o main && ./main`。下面是完整独立程序，包含 3 组真实输入，并打印期望结果和实际结果。

```cpp
#include <algorithm>
#include <array>
#include <climits>
#include <cmath>
#include <deque>
#include <functional>
#include <iostream>
#include <map>
#include <numeric>
#include <optional>
#include <queue>
#include <set>
#include <stack>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
// 依赖说明：C++ STL algorithm：sort、max、min 等通用算法。；C++ STL array：定长数组。；C++ 标准库 climits：整数边界常量。；C++ 标准库 cmath：数学函数。；C++ STL deque：双端队列。；C++ STL functional：function 等函数对象工具。；C++ 标准库 iostream：控制台输入输出。；C++ STL map：有序键值映射。；C++ STL numeric：数值算法。；C++17 STL optional：表示可能为空的值。；C++ STL queue：队列和 priority_queue。；C++ STL set：有序集合。；C++ STL stack：栈。；C++ STL string：字符串。；C++ STL unordered_map：哈希映射。；C++ STL unordered_set：哈希集合。；C++ STL utility：pair 等通用工具。；C++ STL vector：动态数组。

using namespace std;

// 打印标量和数组，便于直接比较实际结果与期望结果。
template<class T> void show(const T& value) { cout << boolalpha << value; }
void show(const string& value) { cout << '"' << value << '"'; }
void show(char value) { cout << '"' << value << '"'; }
template<class T> void show(const optional<T>& value) {
    if (value) show(*value); else cout << "null";
}
template<class T> void show(const vector<T>& values) {
    cout << "[";
    for (size_t i = 0; i < values.size(); ++i) {
        if (i) cout << ", ";
        show(values[i]);
    }
    cout << "]";
}

namespace interview {

// 普通函数与辅助函数声明。
string rightRotate(string s, int k);

// 方法：rightRotate；按题目要求处理输入并返回结果，核心算法见方法体。
    string rightRotate(string s, int k) {
        int n = s.size();
        reverse(s.begin(), s.end());        // 第一步：整体反转，AB -> reverse(B)+reverse(A)
        reverse(s.begin(), s.begin() + k);  // 第二步：反转前k位，恢复出B
        reverse(s.begin() + k, s.end());    // 第三步：反转后n-k位，恢复出A
        return s;  // 最终结果为 B + A，即右旋k位后的字符串
    }

}

int main() {
    // 用例 1：输入 ('abcdefg', 2)；期望 'fgabcde'。
    {
        string arg0 = "abcdefg";
        int arg1 = 2;
        auto result = interview::rightRotate(arg0, arg1);
        cout << "用例 1: 期望=\"fgabcde\" 实际=";
        show(result);
        cout << "\n";
    }
    // 用例 2：输入 ('abc', 1)；期望 'cab'。
    {
        string arg0 = "abc";
        int arg1 = 1;
        auto result = interview::rightRotate(arg0, arg1);
        cout << "用例 2: 期望=\"cab\" 实际=";
        show(result);
        cout << "\n";
    }
    // 用例 3：输入 ('a', 0)；期望 'a'。
    {
        string arg0 = "a";
        int arg1 = 0;
        auto result = interview::rightRotate(arg0, arg1);
        cout << "用例 3: 期望=\"a\" 实际=";
        show(result);
        cout << "\n";
    }
    return 0;
}
```

## 总结

- 右旋 k 位本质上是把字符串看成 `A+B` 两段（A 为前 n-k 位，B 为后 k 位），目标是变成 `B+A`，这跟 0151 题"反转单词顺序但保持单词内部顺序"是同一类问题，都可以用三步反转法解决。
- 三步反转法的通用范式是：整体反转打乱两段内部顺序、颠倒段间顺序 → 分别反转每一段恢复其内部顺序，最终就能得到"段顺序颠倒、段内顺序不变"的效果。
- 反转的分界点是关键：整体反转 `[0, n-1]`，然后按新顺序反转 `[0, k-1]` 和 `[k, n-1]`，别跟旋转前的原始分界点搞混了。
- 要注意 `k` 可能大于字符串长度这个边界情况，通常会先对 `k %= n` 取模处理一下，避免下标越界或者切片异常。
