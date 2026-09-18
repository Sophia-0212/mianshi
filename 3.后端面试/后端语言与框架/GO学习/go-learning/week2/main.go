package main

import (
	"errors"
	"fmt"
)

var ErrEmptyName = errors.New("task name is empty")

type Task struct {
	Name     string
	Done     bool
	Attempts int
}

// 指针接收者：方法可以修改 Task，也能处理 nil 接收者。
func (t *Task) Execute() (string, error) {
	if t == nil {
		return "", errors.New("task is nil")
	}
	if t.Name == "" {
		return "", fmt.Errorf("validate task: %w", ErrEmptyName)
	}

	t.Done = true
	t.Attempts++
	return t.Name + ": success", nil
}

type PrintTask struct {
	Text string
}

func (t PrintTask) Execute() (string, error) {
	if t.Text == "" {
		return "", fmt.Errorf("print task: %w", ErrEmptyName)
	}
	return t.Text, nil
}

// 接口描述调用者需要的能力；Task 和 PrintTask 都隐式实现 Runner。
type Runner interface {
	Execute() (string, error)
}

func runAll(runners []Runner) {
	for _, runner := range runners {
		result, err := runner.Execute()
		if err != nil {
			if errors.Is(err, ErrEmptyName) {
				fmt.Println("validation error:", err)
				continue
			}
			fmt.Println("execute error:", err)
			continue
		}
		fmt.Println(result)
	}
}

func main() {
	// 数组：长度属于类型，赋值会复制全部元素。
	a := [2]int{10, 20}
	b := a
	b[0] = 99
	fmt.Println("array:", a, b)

	// 切片：赋值只复制切片描述符，a 和 c 共享底层数组。
	c := make([]int, 2, 3)
	c[0], c[1] = 10, 20
	d := c
	d[0] = 99
	d = append(d, 30) // 容量足够，仍共享底层数组。
	fmt.Println("slice:", c, d)

	// map：必须初始化后才能写；读取不存在的键得到零值。
	counts := make(map[string]int)
	counts["go"]++
	value, ok := counts["java"]
	fmt.Println("map:", counts, value, ok)

	// nil 切片可读、可遍历、可 append；nil map 不能写。
	var nilSlice []int
	nilSlice = append(nilSlice, 1)
	fmt.Println("nil slice:", nilSlice)

	task := &Task{Name: "read file"}
	runners := []Runner{task, PrintTask{Text: "print result"}, &Task{}}
	runAll(runners)
	fmt.Println("task state:", task.Done, task.Attempts)
}
