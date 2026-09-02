# kama54. 替换数字

**题目描述**

给定一个字符串 `s`，将字符串中的每个数字字符替换成字符串 `"number"`。要求：不能使用额外的辅助数组或字符串，必须在原字符串对应的存储空间上（比如用一个足够大的字符数组）通过原地操作完成替换。

```
示例：
输入: s = "a1b2c3"
输出: "anumberbnumbercnumber"
```

## 思路

这题的核心考点是**不用额外空间的原地扩容双指针技巧**，属于"代码随想录"体系里字符串填充类题目的经典通用方法。表面上看，把 `1` 换成 `number` 是个"变长"操作，直觉上很难在原数组里原地完成——但你想啊，只要提前算好扩容后需要的总长度，再"从后往前"填充，就可以做到不需要额外数组。

具体分两步：

**第一步：计算扩容后的长度。** 遍历一次字符串，统计数字字符的个数 `count`。每个数字字符会从 1 个字符变成 6 个字符（`"number"` 长度为 6），所以扩容后总长度就是原长度加上 `count * 5`（每个数字多出 5 个字符）。

**第二步：从后往前填充。** 这一步才是真正的难点和考点。如果按直觉从前往后填充，会出现一个问题：你把下标 0 的数字换成 `"number"` 之后，原本下标 1 及之后的字符还没处理完，但它们的位置已经被新写入的 `"number"` 覆盖了——数据就这么丢了。

解决方法是**双指针，从后往前**：设 `oldIndex` 指向原字符串的最后一个字符位置，`newIndex` 指向扩容后数组的最后一个字符位置。两个指针同时从后往前移动：

- 如果 `s[oldIndex]` 不是数字，直接把它复制到 `s[newIndex]`，两个指针各左移一位。
- 如果 `s[oldIndex]` 是数字，就把 `newIndex` 位置往前的 6 个字符依次填成 `'r','e','b','m','u','n'`（也就是倒着写 `"number"`），`newIndex` 左移 6 位，`oldIndex` 左移 1 位。

为什么这样就不会覆盖丢数据呢？因为 `newIndex` 永远大于等于 `oldIndex`（扩容后位置只会更靠后或相等），从后往前填充可以保证：每次写入 `newIndex` 位置时，这个位置上原来的旧数据早就已经被读取和处理过了（因为处理顺序是从后往前，后面的位置先处理完），不会出现"还没读就被覆盖"的问题。这是原地扩容类问题的通用解决范式，其他"字符串填充/合并"题目（比如 Java 面试常考的"给定两个长度不同的有序数组原地合并"）也是同样的思路。

复杂度分析：两次遍历（一次统计长度，一次填充），时间复杂度 O(n)；除了存储扩容后结果的数组本身，没有使用额外的辅助数组，额外空间复杂度 O(1)（如果把结果数组也算在内则是 O(n)，但这是必须的输出空间，不算"额外"空间）。

## 代码

### C++

```cpp
class Solution {
public:
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
};
```

### Java

```java
class Solution {
    public String replaceNumber(String s) {
        int count = 0;  // 统计数字字符个数
        int oldSize = s.length();
        for (int i = 0; i < oldSize; i++) {
            if (Character.isDigit(s.charAt(i))) count++;
        }
        char[] res = new char[oldSize + count * 5];  // 扩容后的数组
        int oldIndex = oldSize - 1;
        int newIndex = res.length - 1;
        while (oldIndex >= 0) {  // 双指针从后往前填充
            if (Character.isDigit(s.charAt(oldIndex))) {
                res[newIndex--] = 'r';  // 倒着写入 "number"
                res[newIndex--] = 'e';
                res[newIndex--] = 'b';
                res[newIndex--] = 'm';
                res[newIndex--] = 'u';
                res[newIndex--] = 'n';
            } else {
                res[newIndex--] = s.charAt(oldIndex);  // 非数字字符直接搬移
            }
            oldIndex--;
        }
        return new String(res);
    }
}
```

### Python

标准库一行解（用正则或简单的字符判断+替换）：

```python
import re

class Solution:
    def replaceNumber(self, s: str) -> str:
        return re.sub(r'\d', 'number', s)  # 正则匹配每个数字字符并替换为 "number"
```

手写实现（面试考察点：还原原地扩容双指针填充技巧。注意 Python 字符串不可变，这里用 list 模拟"原地"过程，重点是体现思想而非真正节省内存）：

```python
class Solution:
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

### Go

```go
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

## 总结

- 这题的核心是"原地扩容双指针"技巧：先统计扩容后需要的总长度，再从后往前填充，避免从前往后覆盖导致原始数据在被读取前就丢失。
- "从后往前"的本质原因是：扩容后新位置的下标始终大于等于原位置下标，从后往前处理可以保证每次写入的位置上的旧数据已经被读取过了。
- 这个技巧不是这题专属的，而是字符串/数组"就地扩容""就地合并"类问题的通用范式（比如原地合并两个有序数组）。
- Python 由于字符串不可变，没法做到真正的原地操作，这里用 list 模拟双指针填充的思想，重点是理解算法本身，而不是纠结语言层面的内存优化。
