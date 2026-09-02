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

如果不限制空间，最直接的做法是用切片拼接：`s[-k:] + s[:-k]`，一步就能得到结果。但这题要求不使用额外数组、原地完成旋转，这就要用到**三步反转法**了——跟 0151 题反转单词顺序用的是同一个框架，只是这里"单词"变成了两段：前 `n-k` 个字符和后 `k` 个字符。

思路是这么推导出来的：右旋 `k` 位，本质上就是把字符串从下标 `n-k` 处切成两段 `A`（前 `n-k` 位）和 `B`（后 `k` 位），想要的结果是把顺序从 `AB` 变成 `BA`。这正好对应"反转两个块的相对顺序，但保持每个块内部字符顺序不变"的需求，跟 0151 题反转单词顺序的需求本质上是一样的。所以可以直接套用三步反转法：

1. **整体反转**：把整个字符串 `AB` 反转一下，得到 `reverse(B) + reverse(A)`（原来的 B 在前、A 在后，但两段内部字符顺序都反了）。
2. **反转前 `k` 个字符**：把 `reverse(B)` 这一段再反转一次，恢复成 `B`，这时候字符串就是 `B + reverse(A)`。
3. **反转后 `n-k` 个字符**：把 `reverse(A)` 这一段再反转一次，恢复成 `A`，这时候字符串就是 `B + A`，正是我们要的右旋结果。

关键决策点在于**准确定位反转的分界点**：字符串长度为 `n`，分界点在下标 `n-k` 处。整体反转是 `[0, n-1]`，反转前半段对应新字符串（反转后）的 `[0, k-1]`（这时候前 `k` 个位置放的是原来的 B 段内容，反转回来正是 B），反转后半段对应 `[k, n-1]`（放的是原来的 A 段内容，反转回来正是 A）。

复杂度分析：三次反转都是线性扫描，时间复杂度 O(n)；C++/Java（转 char 数组）/Go 可以做到 O(1) 额外空间的原地操作，Python 字符串不可变需要转 list，额外空间 O(n)。

## 代码

### C++

```cpp
class Solution {
public:
    string rightRotate(string s, int k) {
        int n = s.size();
        reverse(s.begin(), s.end());        // 第一步：整体反转，AB -> reverse(B)+reverse(A)
        reverse(s.begin(), s.begin() + k);  // 第二步：反转前k位，恢复出B
        reverse(s.begin() + k, s.end());    // 第三步：反转后n-k位，恢复出A
        return s;  // 最终结果为 B + A，即右旋k位后的字符串
    }
};
```

### Java

```java
class Solution {
    public String rightRotate(String s, int k) {
        char[] arr = s.toCharArray();  // Java String 不可变，先转成字符数组
        int n = arr.length;
        reverse(arr, 0, n - 1);      // 第一步：整体反转
        reverse(arr, 0, k - 1);      // 第二步：反转前k位，恢复出B
        reverse(arr, k, n - 1);      // 第三步：反转后n-k位，恢复出A
        return new String(arr);
    }

    // 反转 [left, right] 区间（344题双指针反转模板）
    private void reverse(char[] arr, int left, int right) {
        while (left < right) {
            char tmp = arr[left];
            arr[left] = arr[right];
            arr[right] = tmp;
            left++;
            right--;
        }
    }
}
```

### Python

标准库一行解（切片直接拼接，`s[-k:]` 是最后 k 位，`s[:-k]` 是前 n-k 位）：

```python
class Solution:
    def rightRotate(self, s: str, k: int) -> str:
        k %= len(s)  # 防止 k 大于字符串长度导致切片异常
        return s[-k:] + s[:-k] if k else s  # 后k位拼到前面；k=0时切片s[-0:]会出错，需特判
```

手写实现（面试考察点：还原三步反转法。Python字符串不可变，转list模拟原地操作）：

```python
class Solution:
    def rightRotate(self, s: str, k: int) -> str:
        arr = list(s)
        n = len(arr)
        k %= n  # 防止 k 大于字符串长度

        self._reverse(arr, 0, n - 1)  # 第一步：整体反转
        self._reverse(arr, 0, k - 1)  # 第二步：反转前k位，恢复出B段
        self._reverse(arr, k, n - 1)  # 第三步：反转后n-k位，恢复出A段
        return ''.join(arr)

    def _reverse(self, arr: list[str], left: int, right: int) -> None:
        while left < right:  # 344题双指针反转模板
            arr[left], arr[right] = arr[right], arr[left]
            left += 1
            right -= 1
```

### Go

```go
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
func reverse(arr []byte, left, right int) {
    for left < right {
        arr[left], arr[right] = arr[right], arr[left]
        left++
        right--
    }
}
```

## 总结

- 右旋 k 位本质上是把字符串看成 `A+B` 两段（A 为前 n-k 位，B 为后 k 位），目标是变成 `B+A`，这跟 0151 题"反转单词顺序但保持单词内部顺序"是同一类问题，都可以用三步反转法解决。
- 三步反转法的通用范式是：整体反转打乱两段内部顺序、颠倒段间顺序 → 分别反转每一段恢复其内部顺序，最终就能得到"段顺序颠倒、段内顺序不变"的效果。
- 反转的分界点是关键：整体反转 `[0, n-1]`，然后按新顺序反转 `[0, k-1]` 和 `[k, n-1]`，别跟旋转前的原始分界点搞混了。
- 要注意 `k` 可能大于字符串长度这个边界情况，通常会先对 `k %= n` 取模处理一下，避免下标越界或者切片异常。
