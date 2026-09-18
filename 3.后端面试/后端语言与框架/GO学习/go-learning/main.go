package main

import (
	"fmt"
	"sync"
)

func main() {
	var count int
	var wg sync.WaitGroup // 等待两个任务都完成。

	wg.Add(2) // 启动 goroutine 前，先登记任务数量。

	for i := 0; i < 2; i++ {
		go func() {
			defer wg.Done() // 当前任务结束时，计数减一。

			for j := 0; j < 1000; j++ {
				count++ // 故意不加锁：用于观察数据竞争。
			}
		}()
	}

	wg.Wait() // 等所有写入结束后，才读取最终结果。
	fmt.Println("期望结果：", 2000)
	fmt.Println("实际结果：", count)
}
