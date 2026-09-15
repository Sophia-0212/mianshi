def three_sum(nums: list[int]) -> list[list[int]]:
    # 普通函数：排序后使用双指针，并跳过重复值。
    nums = sorted(nums)
    result = []
    for i in range(len(nums) - 2):
        if nums[i] > 0:
            break
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1
    return result


if __name__ == "__main__":
    test_cases = [
        ([-1, 0, 1, 2, -1, -4], [[-1, -1, 2], [-1, 0, 1]]),  # 题目示例
        ([0, 1, 1], []),                                          # 没有解
        ([0, 0, 0, 0], [[0, 0, 0]]),                              # 重复元素
    ]
    for nums, expected in test_cases:
        actual = three_sum(nums)
        print(f"nums={nums}, expected={expected}, actual={actual}")