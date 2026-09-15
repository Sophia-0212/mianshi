# kama54. 替换数字

**题目描述**

给定一个字符串 `s`，将字符串中的每个数字字符替换成字符串 `"number"`。要求：不能使用额外的辅助数组或字符串，必须在原字符串对应的存储空间上（比如用一个足够大的字符数组）通过原地操作完成替换。

```
示例：
输入: s = "a1b2c3"
输出: "anumberbnumbercnumber"
```

## 思路

- 扩容双指针：每个数字多占 5 位，先扩容，再从后向前填充；数字写入 `number`，其余原样写入，避免覆盖未读数据。时间 O(n)；可复用存储时辅助空间 O(1)，Python/Go 分配结果需 O(n)。
- 正则替换：将数字匹配项替换为 `number`。时间 O(n)，空间 O(n)。



## Python

### LeetCode 写法与原有示例

标准库一行解（用正则或简单的字符判断+替换）：

```python
import re

# 依赖说明：Python 标准库 re：提供正则表达式匹配。

class Solution:
    # 方法：replaceNumber；按题目要求处理输入并返回结果，核心算法见方法体。
    def replaceNumber(self, s: str) -> str:
        return re.sub(r'\d', 'number', s)  # 正则匹配每个数字字符并替换为 "number"
```


手写实现（面试考察点：还原原地扩容双指针填充技巧。注意 Python 字符串不可变，这里用 list 模拟"原地"过程，重点是体现思想而非真正节省内存）：

```python
# 依赖说明：len：Python 内置函数：返回容器中元素的数量。；sum：Python 内置函数：计算可迭代对象元素的总和。

# 依赖说明：len：Python 内置函数：返回容器中元素的数量。

class Solution:
    # 方法：replaceNumber；按题目要求处理输入并返回结果，核心算法见方法体。
    def replaceNumber(self, s: str) -> str:
        arr = list(s)
        count = sum(1 for ch in arr if ch.isdigit())  # 统计数字字符个数
        old_size = len(arr)
        new_size = old_size + count * 5  # 每个数字多占5个字符
        arr.extend(['\0'] * (count * 5))  # 扩容到新长度（模拟C++的resize）

        old_index, new_index = old_size - 1, new_size - 1
        while old_index >= 0:  # 双指针从后往前填充，避免覆盖未处理的数据
            if arr[old_index].isdigit():
                for ch in reversed('number'):  # 倒着写入 "number" 的每个字符
                    arr[new_index] = ch
                    new_index -= 1
            else:
                arr[new_index] = arr[old_index]  # 非数字字符直接搬移
                new_index -= 1
            old_index -= 1
        return ''.join(arr)
```

### 面试普通函数写法（可直接运行）

保存为 `main.py`，执行 `python3 main.py`。下面是完整独立程序，包含 3 组真实输入，并打印期望结果和实际结果。

```python
from __future__ import annotations
from collections import deque, Counter, defaultdict
from typing import Optional, List

# 依赖说明：Python 内置 future 特性：annotations 让类型标注延迟解析。；Python 标准库 collections：deque 是双端队列，Counter 是计数器，defaultdict 是带默认值的字典。；Python 标准库 typing：Optional、List 等只用于类型标注。；len：Python 内置函数：返回容器中元素的数量。；sum：Python 内置函数：计算可迭代对象元素的总和。

# 依赖说明：Python 内置 future 特性：annotations 让类型标注延迟解析。；Python 标准库 collections：deque 是双端队列，Counter 是计数器，defaultdict 是带默认值的字典。；Python 标准库 typing：Optional、List 等只用于类型标注。；len：Python 内置函数：返回容器中元素的数量。

# 普通函数：保留题目的核心算法，不依赖 Solution 或在线判题平台。
# 方法：replaceNumber；按题目要求处理输入并返回结果，核心算法见方法体。
def replaceNumber(s: str) -> str:
    arr = list(s)
    count = sum(1 for ch in arr if ch.isdigit())  # 统计数字字符个数
    old_size = len(arr)
    new_size = old_size + count * 5  # 每个数字多占5个字符
    arr.extend(['\0'] * (count * 5))  # 扩容到新长度（模拟C++的resize）

    old_index, new_index = old_size - 1, new_size - 1
    while old_index >= 0:  # 双指针从后往前填充，避免覆盖未处理的数据
        if arr[old_index].isdigit():
            for ch in reversed('number'):  # 倒着写入 "number" 的每个字符
                arr[new_index] = ch
                new_index -= 1
        else:
            arr[new_index] = arr[old_index]  # 非数字字符直接搬移
            new_index -= 1
        old_index -= 1
    return ''.join(arr)


if __name__ == "__main__":
    # 用例 1：输入 ('a1b2',)；期望 'anumberbnumber'。
    arg0 = 'a1b2'
    result = replaceNumber(arg0)
    expected = 'anumberbnumber'
    print("用例 1: 期望=", expected, "实际=", result)
    assert result == expected

    # 用例 2：输入 ('abc',)；期望 'abc'。
    arg0 = 'abc'
    result = replaceNumber(arg0)
    expected = 'abc'
    print("用例 2: 期望=", expected, "实际=", result)
    assert result == expected

    # 用例 3：输入 ('12',)；期望 'numbernumber'。
    arg0 = '12'
    result = replaceNumber(arg0)
    expected = 'numbernumber'
    print("用例 3: 期望=", expected, "实际=", result)
    assert result == expected
```

## Go

### LeetCode 写法与原有示例

```go
// 方法：replaceNumber；按题目要求处理输入并返回结果，核心算法见方法体。
func replaceNumber(s string) string {
    count := 0
    for _, ch := range s {
        if ch >= '0' && ch <= '9' {
            count++ // 统计数字字符个数
        }
    }
    oldSize := len(s)
    newSize := oldSize + count*5 // 每个数字多占5个字符
    res := make([]byte, newSize)

    oldIndex, newIndex := oldSize-1, newSize-1
    for oldIndex >= 0 { // 双指针从后往前填充
        if s[oldIndex] >= '0' && s[oldIndex] <= '9' {
            copy(res[newIndex-5:newIndex+1], "number") // 倒序区间正好对应正序的"number"
            newIndex -= 6
        } else {
            res[newIndex] = s[oldIndex] // 非数字字符直接搬移
            newIndex--
        }
        oldIndex--
    }
    return string(res)
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
// 方法：replaceNumber；按题目要求处理输入并返回结果，核心算法见方法体。
func replaceNumber(s string) string {
    count := 0
    for _, ch := range s {
        if ch >= '0' && ch <= '9' {
            count++ // 统计数字字符个数
        }
    }
    oldSize := len(s)
    newSize := oldSize + count*5 // 每个数字多占5个字符
    res := make([]byte, newSize)

    oldIndex, newIndex := oldSize-1, newSize-1
    for oldIndex >= 0 { // 双指针从后往前填充
        if s[oldIndex] >= '0' && s[oldIndex] <= '9' {
            copy(res[newIndex-5:newIndex+1], "number") // 倒序区间正好对应正序的"number"
            newIndex -= 6
        } else {
            res[newIndex] = s[oldIndex] // 非数字字符直接搬移
            newIndex--
        }
        oldIndex--
    }
    return string(res)
}

func main() {
    // 用例 1：输入 ('a1b2',)；期望 'anumberbnumber'。
    {
        arg0 := "a1b2"
        result := replaceNumber(arg0)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 1: 期望=\"anumberbnumber\" 实际=", string(data))
    }
    // 用例 2：输入 ('abc',)；期望 'abc'。
    {
        arg0 := "abc"
        result := replaceNumber(arg0)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 2: 期望=\"abc\" 实际=", string(data))
    }
    // 用例 3：输入 ('12',)；期望 'numbernumber'。
    {
        arg0 := "12"
        result := replaceNumber(arg0)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 3: 期望=\"numbernumber\" 实际=", string(data))
    }
}
```

## C++

### LeetCode 写法与原有示例

```cpp
// 依赖说明：string：C++ STL 字符串类型。

class Solution {
public:
    // 方法：replaceNumber；按题目要求处理输入并返回结果，核心算法见方法体。
    string replaceNumber(string s) {
        int count = 0;  // 统计数字字符个数
        int oldSize = s.size();
        for (int i = 0; i < oldSize; i++) {
            if (s[i] >= '0' && s[i] <= '9') count++;
        }
        s.resize(oldSize + count * 5);  // 每个数字多占5个字符，扩容到新长度
        int newSize = s.size();
        // 双指针从后往前填充，避免正序覆盖导致数据丢失
        for (int oldIndex = oldSize - 1, newIndex = newSize - 1; oldIndex >= 0; oldIndex--) {
            if (s[oldIndex] >= '0' && s[oldIndex] <= '9') {
                s[newIndex--] = 'r';  // 倒着写入 "number"
                s[newIndex--] = 'e';
                s[newIndex--] = 'b';
                s[newIndex--] = 'm';
                s[newIndex--] = 'u';
                s[newIndex--] = 'n';
            } else {
                s[newIndex--] = s[oldIndex];  // 非数字字符直接搬移到新位置
            }
        }
        return s;
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
string replaceNumber(string s);

// 方法：replaceNumber；按题目要求处理输入并返回结果，核心算法见方法体。
    string replaceNumber(string s) {
        int count = 0;  // 统计数字字符个数
        int oldSize = s.size();
        for (int i = 0; i < oldSize; i++) {
            if (s[i] >= '0' && s[i] <= '9') count++;
        }
        s.resize(oldSize + count * 5);  // 每个数字多占5个字符，扩容到新长度
        int newSize = s.size();
        // 双指针从后往前填充，避免正序覆盖导致数据丢失
        for (int oldIndex = oldSize - 1, newIndex = newSize - 1; oldIndex >= 0; oldIndex--) {
            if (s[oldIndex] >= '0' && s[oldIndex] <= '9') {
                s[newIndex--] = 'r';  // 倒着写入 "number"
                s[newIndex--] = 'e';
                s[newIndex--] = 'b';
                s[newIndex--] = 'm';
                s[newIndex--] = 'u';
                s[newIndex--] = 'n';
            } else {
                s[newIndex--] = s[oldIndex];  // 非数字字符直接搬移到新位置
            }
        }
        return s;
    }

}

int main() {
    // 用例 1：输入 ('a1b2',)；期望 'anumberbnumber'。
    {
        string arg0 = "a1b2";
        auto result = interview::replaceNumber(arg0);
        cout << "用例 1: 期望=\"anumberbnumber\" 实际=";
        show(result);
        cout << "\n";
    }
    // 用例 2：输入 ('abc',)；期望 'abc'。
    {
        string arg0 = "abc";
        auto result = interview::replaceNumber(arg0);
        cout << "用例 2: 期望=\"abc\" 实际=";
        show(result);
        cout << "\n";
    }
    // 用例 3：输入 ('12',)；期望 'numbernumber'。
    {
        string arg0 = "12";
        auto result = interview::replaceNumber(arg0);
        cout << "用例 3: 期望=\"numbernumber\" 实际=";
        show(result);
        cout << "\n";
    }
    return 0;
}
```

## 总结

- 这题的核心是"原地扩容双指针"技巧：先统计扩容后需要的总长度，再从后往前填充，避免从前往后覆盖导致原始数据在被读取前就丢失。
- "从后往前"的本质原因是：扩容后新位置的下标始终大于等于原位置下标，从后往前处理可以保证每次写入的位置上的旧数据已经被读取过了。
- 这个技巧不是这题专属的，而是字符串/数组"就地扩容""就地合并"类问题的通用范式（比如原地合并两个有序数组）。
- Python 由于字符串不可变，没法做到真正的原地操作，这里用 list 模拟双指针填充的思想，重点是理解算法本身，而不是纠结语言层面的内存优化。
