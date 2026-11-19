---
title: 算法刷题Day1
published: 2026-11-19
updated: 2026-11-19
description: 初步认识AI以及大模型
image: ''
tags: [二分查找,双指针]
category: 算法
draft: false 
---
# 力扣704.二分查找

典型的板子题目，左右指针每次都对半缩短查找，一直到找到对应目标值为止：

~~~java
class Solution {
    public int search(int[] nums, int target) {
        int l = 0;
        int is = -1;
        int r = nums.length-1;

        while(l<=r){
            int mid = l+(r-l)/2;
            if(nums[mid]<target)l = mid + 1;
            else if(nums[mid] == target){
                is = mid;
                return is;
            }
            else r = mid - 1;
        }

       return is;
    }
}
~~~

>[!TIP]
时间复杂度：O(logn)，其中 n 是数组的长度。

空间复杂度：O(1)。

# 力扣27.移除元素

题目
---

给你一个数组 nums 和一个值 val，你需要 原地 移除所有数值等于 val 的元素。元素的顺序可能发生改变。然后返回 nums 中与 val 不同的元素的数量。

假设 nums 中不等于 val 的元素数量为 k，要通过此题，您需要执行以下操作：

更改 nums 数组，使 nums 的前 k 个元素包含不等于 val 的元素。nums 的其余元素和 nums 的大小并不重要。
返回 k

---

双指针方法，通过左右指针，右指针表示当前的元素，左指针表示下一个要复制的位置，如果右指针是目标元素，则不复制左指针不动，反之将右指针的值给左指针，然后左指针移动，这样就在一个数组里构造出最后的输出数组了

~~~java
class Solution {
    public int removeElement(int[] nums, int val) {
        int len = nums.length;
        int left = 0;
        for(int right = 0;right < len;right++){
            if(nums[right] != val){
                nums[left] = nums[right];
                left++;
            }
        }
        return left;
    }
}
~~~

>[!TIP]
时间复杂度：o（n）<br>
空间复杂度：o（1）

# 力扣977. 有序数组的平方

---
给你一个按 非递减顺序 排序的整数数组 nums，返回 每个数字的平方 组成的新数组，要求也按 非递减顺序 排序。

---

## 思路1---直接平方排序

~~~java
class Solution {
    public int[] sortedSquares(int[] nums) {
        int len = nums.length;
        for(int i = 0;i<len;i++){
            nums[i]  = nums[i] * nums[i];
        }
        Arrays.sort(nums);
        return nums;
    }
}
~~~

时间复杂度：O(nlogn)，其中 n 是数组 nums 的长度。

空间复杂度：O(n)。

## 思路二---双指针

双指针就是左右指针分别指向首尾，然后由于原数组就是升序的，所以我们在平方完之后对于正数跟负数的部分也是有序的，所以我们就可以比较平方完之后的大小后进行排序，如果全是正数或者负数的情况很简单，正数负数都有的话就需要进行比较大小存入答案数组了

~~~java
class Solution {
    public int[] sortedSquares(int[] nums) {
        int n = nums.length;
        int negative = -1;
        for (int i = 0; i < n; ++i) {
            if (nums[i] < 0) {
                negative = i;
            } else {
                break;
            }
        }

        int[] ans = new int[n];
        int index = 0, i = negative, j = negative + 1;
        while (i >= 0 || j < n) {
            if (i < 0) {
                ans[index] = nums[j] * nums[j];
                ++j;
            } else if (j == n) {
                ans[index] = nums[i] * nums[i];
                --i;
            } else if (nums[i] * nums[i] < nums[j] * nums[j]) {
                ans[index] = nums[i] * nums[i];
                --i;
            } else {
                ans[index] = nums[j] * nums[j];
                ++j;
            }
            ++index;
        }

        return ans;
    }
}

作者：力扣官方题解
链接：https://leetcode.cn/problems/squares-of-a-sorted-array/solutions/447736/you-xu-shu-zu-de-ping-fang-by-leetcode-solution/
来源：力扣（LeetCode）
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
~~~

时间复杂度：O(n)，其中 n 是数组 nums 的长度。

空间复杂度：O(1)。除了存储答案的数组以外，我们只需要维护常量空间。
