---
title: 算法刷题Day2
published: 2026-11-23
updated: 2026-11-23
description: 长度最小的子数组
image: ''
tags: [螺旋矩阵模拟，双指针滑动窗口]
category: 算法
draft: false 
---
# 209.长度最小的子数组

---
给定一个含有 n 个正整数的数组和一个正整数 s ，找出该数组中满足其和 ≥ s 的长度最小的 连续 子数组，并返回其长度。如果不存在符合条件的子数组，返回 0。

---

示例：<br>

输入：s = 7, nums = [2,3,1,2,4,3]<br>
输出：2<br>
解释：子数组 [4,3] 是该条件下的长度最小的子数组。<br>

## 暴力
我们第一想法就是直接双重遍历，因为答案一定是子数组也即是连续的，那么我们就遍历，第一次累加到满足target长度就是这次遍历最小，然后我们再进行下一次遍历，一次一次比较最小值
~~~java
class Solution {
    public int minSubArrayLen(int target, int[] nums) {
     int len = nums.length;
     int sum  = 0;
     int ans = 100005;
     for(int i = 0;i<len;i++){
        sum = 0;
        for(int j = i;j<len;j++){
            sum+=nums[j];
            if(sum>=target){
                ans = Math.min(ans,j-i+1);
                break;
            }
        }
     }
     if(ans == 100005)return 0;  
     return ans; 
    }
}
~~~
>[!NOTE]
但是这样的时间复杂度是o（n*n）对于数组长度超过10^3就会超时，我们需要优化
## 滑动窗口
- 我们可以借助**双指针**的思想，因为我们想要求出长度，必须要遍历数组，所以我们只能在遍历上优化，双指针就是常用的优化方式，
- 我们设置一个**起始指针**以及**末尾指针**，如果这之间的sum满足题意，我们就缩小长度，也即是起始指针前进，反之末尾指针前进
- 
~~~java
class Solution {
    public int minSubArrayLen(int target, int[] nums) {
     int len = nums.length;
     int sum  = 0;
     int ans = 100005;
     int i = 0;//start point
     int sublen = -1;//当前长度
     for(int j = 0;j<len;j++){
        sum+=nums[j];
        while(sum>=target){
         sublen = j-i+1;
         sum-=nums[i++];//减去要移除的i下的位置，i++
         ans = Math.min(ans,sublen);
        }
     }
     return ans == 100005 ? 0 : ans;
    }
}
~~~
>[!TIP]
这里的时间复杂度是o（n）因为我们就像是滑动窗口一样每个元素只有遍历了一次

# 59.螺旋矩阵II
一个模拟题目，模拟一圈的规律，这里需要考虑很多，我们可以拆开来看：<br>
- 从左到右遍历，列在发生变化，一直到右边的某个列为止，而这个边界会随着圈数而改变，我们就可以定义一个变量记录
- 从上到下遍历，类似，行变化，我们也可以记录行的边界
- 从右到左，类似的行变化，区别就是列在缩小
- 从下到上，同理
  

代码出自代码随想录中:
~~~java
class Solution {
    public int[][] generateMatrix(int n) {
        int[][] nums = new int[n][n];
        int startX = 0, startY = 0;  // 每一圈的起始点
        int offset = 1;
        int count = 1;  // 矩阵中需要填写的数字
        int loop = 1; // 记录当前的圈数
        int i, j; // j 代表列, i 代表行;

        while (loop <= n / 2) {

            // 顶部
            // 左闭右开，所以判断循环结束时， j 不能等于 n - offset
            for (j = startY; j < n - offset; j++) {
                nums[startX][j] = count++;
            }

            // 右列
            // 左闭右开，所以判断循环结束时， i 不能等于 n - offset
            for (i = startX; i < n - offset; i++) {
                nums[i][j] = count++;
            }

            // 底部
            // 左闭右开，所以判断循环结束时， j != startY
            for (; j > startY; j--) {
                nums[i][j] = count++;
            }

            // 左列
            // 左闭右开，所以判断循环结束时， i != startX
            for (; i > startX; i--) {
                nums[i][j] = count++;
            }
            startX++;
            startY++;
            offset++;
            loop++;
        }
        if (n % 2 == 1) { // n 为奇数时，单独处理矩阵中心的值
            nums[startX][startY] = count;
        }
        return nums;
    }
}
~~~