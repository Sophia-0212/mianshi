# 根据身高重建队列（vector原理讲解）

按身高降序、同高 k 升序处理，将每个人插入下标 k。

| 容器 | 定位第 k 位 | 插入 | 总计 |
|---|---|---|---|
| vector | O(1) | 搬移后续元素 O(n) | 单次 O(n)，全部 O(n²) |
| 链表 | O(n) | 已定位后重连 O(1) | 单次 O(n)，全部 O(n²) |

两者存储均 O(n)。vector 内存连续，搬移通常缓存友好；链表不能消除按位置查找成本。需降低整体时间时，可用树状数组／线段树定位空位，达到 O(n log n)。

## Python

### LeetCode 写法与原有示例



### 面试普通函数写法（可直接运行）

保存为 `main.py`，执行 `python3 main.py`。下面是完整独立程序，包含 3 组真实输入，并打印期望结果和实际结果。

```python
from __future__ import annotations
from collections import deque, Counter, defaultdict
from typing import Optional, List

# 依赖说明：Python 内置 future 特性：annotations 让类型标注延迟解析。；Python 标准库 collections：deque 是双端队列，Counter 是计数器，defaultdict 是带默认值的字典。；Python 标准库 typing：Optional、List 等只用于类型标注。

# 普通函数：保留题目的核心算法，不依赖 Solution 或在线判题平台。
# 方法：reconstructQueue；按题目要求处理输入并返回结果，核心算法见方法体。
def reconstructQueue(people: list[list[int]]) -> list[list[int]]:
    # 身高降序；身高相同时 k 升序
    people.sort(key=lambda p: (-p[0], p[1]))

    result = []
    for p in people:
        result.insert(p[1], p)  # 插入到下标为 k 的位置
    return result


if __name__ == "__main__":
    # 用例 1：输入 ([[7, 0], [4, 4], [7, 1], [5, 0], [6, 1], [5, 2]],)；期望 [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]]。
    arg0 = [[7, 0], [4, 4], [7, 1], [5, 0], [6, 1], [5, 2]]
    result = reconstructQueue(arg0)
    expected = [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]]
    print("用例 1: 期望=", expected, "实际=", result)
    assert result == expected

    # 用例 2：输入 ([[6, 0], [5, 0], [4, 0]],)；期望 [[4, 0], [5, 0], [6, 0]]。
    arg0 = [[6, 0], [5, 0], [4, 0]]
    result = reconstructQueue(arg0)
    expected = [[4, 0], [5, 0], [6, 0]]
    print("用例 2: 期望=", expected, "实际=", result)
    assert result == expected

    # 用例 3：输入 ([[1, 0]],)；期望 [[1, 0]]。
    arg0 = [[1, 0]]
    result = reconstructQueue(arg0)
    expected = [[1, 0]]
    print("用例 3: 期望=", expected, "实际=", result)
    assert result == expected```

## Go

### LeetCode 写法与原有示例



### 面试普通函数写法（可直接运行）

保存为 `main.go`，执行 `go run main.go`。下面是完整独立程序，包含 3 组真实输入，并打印期望结果和实际结果。

```go
// 依赖说明：Go 标准库 encoding/json：JSON 编码和解码。；Go 标准库 fmt：格式化输出和输入。；Go 标准库 sort：排序切片。
package main

import (
    "encoding/json"
    "fmt"
    "sort"
)

// 普通函数和题目中的核心算法。
// 方法：reconstructQueue；按题目要求处理输入并返回结果，核心算法见方法体。
func reconstructQueue(people [][]int) [][]int {
    // 身高降序；身高相同时 k 升序
    sort.Slice(people, func(i, j int) bool {
        if people[i][0] == people[j][0] {
            return people[i][1] < people[j][1]
        }
        return people[i][0] > people[j][0]
    })

    result := make([][]int, 0, len(people))
    for _, p := range people {
        k := p[1]
        result = append(result, nil)
        copy(result[k+1:], result[k:]) // 后面元素整体后移一位
        result[k] = p                  // 插入到下标为 k 的位置
    }
    return result
}

func main() {
    // 用例 1：输入 ([[7, 0], [4, 4], [7, 1], [5, 0], [6, 1], [5, 2]],)；期望 [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]]。
    {
        arg0 := [][]int{[]int{7, 0}, []int{4, 4}, []int{7, 1}, []int{5, 0}, []int{6, 1}, []int{5, 2}}
        result := reconstructQueue(arg0)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 1: 期望=[[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]] 实际=", string(data))
    }
    // 用例 2：输入 ([[6, 0], [5, 0], [4, 0]],)；期望 [[4, 0], [5, 0], [6, 0]]。
    {
        arg0 := [][]int{[]int{6, 0}, []int{5, 0}, []int{4, 0}}
        result := reconstructQueue(arg0)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 2: 期望=[[4, 0], [5, 0], [6, 0]] 实际=", string(data))
    }
    // 用例 3：输入 ([[1, 0]],)；期望 [[1, 0]]。
    {
        arg0 := [][]int{[]int{1, 0}}
        result := reconstructQueue(arg0)
        data, err := json.Marshal(result)
        if err != nil { panic(err) }
        fmt.Println("用例 3: 期望=[[1, 0]] 实际=", string(data))
    }
}```

## C++

### LeetCode 写法与原有示例

```cpp
vector<vector<int>> result;
result.insert(result.begin() + k, person); // 插入到第k位，之后所有元素向后搬移
```

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
vector<vector<int>> reconstructQueue(vector<vector<int>>& people);

vector<vector<int>> reconstructQueue(vector<vector<int>>& people) {
        // 身高降序；身高相同时 k 升序
        sort(people.begin(), people.end(), [](const vector<int>& a, const vector<int>& b) {
            if (a[0] == b[0]) return a[1] < b[1];
            return a[0] > b[0];
        });

        vector<vector<int>> result;
        for (auto& p : people) {
            result.insert(result.begin() + p[1], p); // 插入到下标为 k 的位置
        }
        return result;
    }

}

int main() {
    // 用例 1：输入 ([[7, 0], [4, 4], [7, 1], [5, 0], [6, 1], [5, 2]],)；期望 [[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]]。
    {
        vector<vector<int>> arg0 = {{7, 0}, {4, 4}, {7, 1}, {5, 0}, {6, 1}, {5, 2}};
        auto result = interview::reconstructQueue(arg0);
        cout << "用例 1: 期望=[[5, 0], [7, 0], [5, 2], [6, 1], [4, 4], [7, 1]] 实际=";
        show(result);
        cout << "\n";
    }
    // 用例 2：输入 ([[6, 0], [5, 0], [4, 0]],)；期望 [[4, 0], [5, 0], [6, 0]]。
    {
        vector<vector<int>> arg0 = {{6, 0}, {5, 0}, {4, 0}};
        auto result = interview::reconstructQueue(arg0);
        cout << "用例 2: 期望=[[4, 0], [5, 0], [6, 0]] 实际=";
        show(result);
        cout << "\n";
    }
    // 用例 3：输入 ([[1, 0]],)；期望 [[1, 0]]。
    {
        vector<vector<int>> arg0 = {{1, 0}};
        auto result = interview::reconstructQueue(arg0);
        cout << "用例 3: 期望=[[1, 0]] 实际=";
        show(result);
        cout << "\n";
    }
    return 0;
}```

