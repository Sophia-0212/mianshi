#!/usr/bin/env python3
"""交互教学剧本：所有模型输出、分数、人工标签均为模拟，无网络调用。"""
import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path


NOTICE = "教学模拟 · 不调用模型 · 数字不是实测 · 不证明任何真实模型存在偏好"
RULE = "保护期内客户转移，须经原负责人同意，且主管审批通过。"
ANSWER = "保护期内客户，经主管审批通过后即可转移。"
METRIC = "业务条件完整性通过/不通过（自定义判据，不是 RAGAS 忠实度分数）"
STAGES = [
    "审查高分答案", "统一业务判据", "升级同系列评委", "更换跨系列评委",
    "检查是否只是更严格", "补测另一来源", "交叉盲评", "查看中间判断", "独立验证与复盘",
]


def make_records(split="探索集", errors=20, correct=20):
    """逐条存储结果，再聚合。教学刻意构造对角线偏宽松的模式。"""
    limits = ({"GPT": {"GPT初版": 12, "GPT升级版": 10, "Claude": 3},
               "Claude": {"GPT初版": 5, "GPT升级版": 4, "Claude": 11}}
              if split == "探索集" else
              {"GPT": {"GPT初版": 6, "GPT升级版": 5, "Claude": 2},
               "Claude": {"GPT初版": 3, "GPT升级版": 2, "Claude": 5}})
    rows = []
    for source in ("GPT", "Claude"):
        for human_pass, count in ((False, errors), (True, correct)):
            for i in range(count):
                judgments = {}
                for judge, limit in limits[source].items():
                    judgments[judge] = i < limit if not human_pass else i >= (2 if split == "探索集" else 1)
                rows.append({
                    "answer_id": "{}-{}-{}-{:02d}".format(split, source, "正确" if human_pass else "错误", i + 1),
                    "question_id": "{}-{}-{:02d}".format(split, "完整" if human_pass else "遗漏", i + 1),
                    "source": source, "human_pass": human_pass, "judgments": judgments,
                    "split": split, "simulated": True,
                })
    return rows


def stats(rows, source, judge):
    group = [r for r in rows if r["source"] == source]
    bad = [r for r in group if not r["human_pass"]]
    good = [r for r in group if r["human_pass"]]
    missed = sum(r["judgments"][judge] for r in bad)
    killed = sum(not r["judgments"][judge] for r in good)
    return missed, len(bad), killed, len(good)


class Demo:
    def __init__(self, auto=False, animate=True):
        self.auto = auto
        self.animate = animate and sys.stdout.isatty()
        self.events = []
        self.rows = make_records()
        self.validation = make_records("验证集", 10, 10)

    def say(self, message=""):
        print(message, flush=True)
        self.events.append({"type": "observation", "text": message})

    def flow(self, *steps):
        for i, step in enumerate(steps):
            self.say(("  ↓\n" if i else "") + "  " + step)
            if self.animate:
                time.sleep(0.22)

    def choose(self, prompt, options, default=1):
        self.say("\n你的动作：" + prompt)
        for index, (label, _) in enumerate(options, 1):
            self.say("  {}. {}".format(index, label))
        while True:
            if self.auto:
                answer = str(default)
                self.say("  [自动演示选择 {}]".format(answer))
            else:
                try:
                    answer = input("输入编号（r 回看选项，q 退出）：").strip().lower()
                except EOFError:
                    raise SystemExit("输入已结束。批量演示请使用 --auto。")
            if answer == "q":
                raise KeyboardInterrupt
            if answer == "r":
                self.say(prompt)
                for index, (label, _) in enumerate(options, 1):
                    self.say("  {}. {}".format(index, label))
                continue
            if answer.isdigit() and 1 <= int(answer) <= len(options):
                label, feedback = options[int(answer) - 1]
                self.events.append({"type": "decision", "question": prompt, "choice": label})
                self.say("\n反馈：" + feedback)
                return int(answer)
            self.say("请输入列出的编号。")

    def pause(self):
        if self.auto:
            return
        try:
            value = input("\n回车进入下一步（q 退出）：").strip().lower()
        except EOFError:
            raise SystemExit("输入已结束。批量演示请使用 --auto。")
        if value == "q":
            raise KeyboardInterrupt

    def result(self, source, judge, rows=None):
        m, b, k, g = stats(self.rows if rows is None else rows, source, judge)
        self.say("  {}答案 / {}评委：漏判 {}/{} = {:.0%}；误杀 {}/{} = {:.0%}".format(
            source, judge, m, b, m / b, k, g, k / g))

    def run(self):
        self.say("\n╭──────────────────────────────────────────────╮")
        self.say("  CRM 评测排查实验室 | 你是本次排查负责人")
        self.say("╰──────────────────────────────────────────────╯")
        self.say(NOTICE)
        self.say("约 8–12 分钟，共 9 步。选择会触发解释或诊断分支，最终汇入同一教学实验。")
        self.say("GPT初版/升级版、Claude 是教学角色，不对应具体版本实测。")
        self.say("业务规则也为虚构。日志默认不写磁盘，可用 --report 保存。")
        for index, (title, action) in enumerate(zip(STAGES, (
            self.inspect_answer, self.rubric, self.upgrade, self.switch,
            self.strictness, self.other_source, self.cross, self.trace, self.review,
        )), 1):
            self.say("\n" + "━" * 48)
            self.say("[{}/9] {}  {}".format(index, title, "●" * index + "○" * (9-index)))
            self.say("[模拟数据]")
            action()
            if index < len(STAGES):
                self.pause()
        self.say("\n完成。你验证的是一段预设的偏差模式；真实项目可能得出不同结论。")

    def inspect_answer(self):
        self.flow("销售提问：保护期内客户能转给其他销售吗？", "检索返回规则：" + RULE,
                  "GPT生成答案：" + ANSWER, "GPT评委：事实正确性 0.94（模拟），自动高分", "业务复核：这份答案不能直接指导操作")
        self.choose("你怎么看这份回答？", [
            ("判不通过：缺少原负责人同意", "定位到必要条件遗漏。现在只能说评委漏判，不能归因于模型系列。"),
            ("判通过：主体流程已经说清楚", "执行前提从‘A且B’变成‘B’，会扩大可操作范围，属于业务错误。"),
            ("先看原始证据，怀疑检索漏召回", "完整规则已经进入上下文，‘原负责人同意’可见。这个案例的问题在生成和评判，不能靠扩大召回解释。"),
        ])

    def rubric(self):
        self.say("你遇到的阻力：研发认为‘审批说到了’，业务认为‘前提没说全’。谁的标准算数？")
        self.choose("如何先统一判据？", [
            ("列必要条件，由业务复核", "把可省略背景和不可省略条件分开标注。"),
            ("直接把通过阈值从0.9提高到0.95", "提高阈值可能增加误杀，且无法修复评委漏掉事实。先明确错误定义。"),
        ])
        self.say("\n本实验固定判据：\n  [必须] 原负责人同意\n  [必须] 主管审批通过\n  [禁止] 表述为满足其中一项即可转移")
        self.say("人工标签：两名业务复核者独立标注；争议样本先裁决，再用于本实验。此流程为模拟。")
        self.say("后续统计采用：" + METRIC)
        self.say("漏判率 = 人工判错但评委放过 / 人工判错总数。\n误杀率 = 人工判对但评委拒绝 / 人工判对总数。")

    def upgrade(self):
        self.say("冻结探索集：GPT答案40份，人工标为20份错误、20份正确。后续换评委时不重新生成。")
        self.result("GPT", "GPT初版")
        self.choose("你的第一个假设是什么？", [
            ("评委能力不足，试更强的同系列模型", "保持答案、证据、判据不变，只替换评委。"),
            ("肯定是同系列偏好，直接宣布结论", "一个评委、一个答案来源，无法区分能力、宽松程度与来源偏好。先验证能力假设。"),
            ("修改生成Prompt后重新评测", "这能改善产品，但同时改变答案会干扰评委诊断。本实验先冻结答案。"),
        ])
        self.flow("读取冻结答案", "替换为GPT升级版评委", "逐条核查必要条件", "重新统计漏判与误杀")
        self.result("GPT", "GPT升级版")
        self.say("观察：漏判从12份变10份，仍集中在前提和例外条件。升级有改善，原因尚未确定。")

    def switch(self):
        self.choose("同类漏判仍存在，接下来做什么？", [
            ("让Claude评价同一批答案", "只换评委，继续使用冻结文本和同一判据。"),
            ("先查看评委中间判断", "模拟记录显示：评委把‘A且B’与‘B’误判为语义一致。可以排查Prompt，但这仍不能说明来源偏好。"),
        ])
        self.flow("同一批GPT答案", "Claude逐条判断", "与原人工标签逐条对齐")
        m, b, _, _ = stats(self.rows, "GPT", "Claude")
        self.say("观察：漏判 {}/{} = {:.0%}，比GPT升级版少。误杀结果下一步查看。".format(m, b, m/b))
        self.say("此时的合理判断：Claude可能更适合这类问题，也可能只是更严格。")

    def strictness(self):
        self.choose("用什么区分‘更准’和‘更严格’？", [
            ("查看人工判对的20份答案", "必须同时检查正确答案是否被误杀。"),
            ("平均分越低，说明评委越可靠", "全部判不通过也能消除漏判，但会误杀所有正确答案。平均分不能说明可靠性。"),
        ])
        self.result("GPT", "GPT升级版")
        self.result("GPT", "Claude")
        self.say("观察：在这40份模拟答案中，Claude漏判更少，误杀同为2份。")
        self.say("可支持：Claude在这批样本上更符合人工。不可支持：所有模型、所有业务都如此。")

    def other_source(self):
        self.say("新的线索：生成模型选型时，你补充了Claude生成的答案。不是让它改写旧答案。")
        self.say("同一批问题与证据，独立生成、人工盲标；再按错误类型与人工质量分组。")
        self.flow("Claude答案冻结", "Claude评委判断", "人工复核发现条件遗漏仍被放过")
        self.result("Claude", "Claude")
        self.choose("这能直接说明Claude偏爱自己吗？", [
            ("不能，先让GPT评同一批Claude答案", "同一份答案由两个评委判断，避免重新生成引入变化。"),
            ("能，刚才它明明能识别遗漏", "两批答案的错误隐蔽程度可能不同，不能把两次结果当作同一对象的比较。"),
        ])
        self.result("Claude", "GPT升级版")
        self.say("观察：换答案来源后，评委相对表现发生反转。它提示来源相关偏差，尚需受控验证。")

    def cross(self):
        self.choose("交叉实验应该冻结哪些变量？", [
            ("问题、证据、答案、判据；隐藏来源", "生成时固定问题、证据和Prompt；完成后固定全部答案。来源只用于事后统计。"),
            ("每换一次评委，就重新生成一次答案", "这样答案也变了，无法隔离评委差异。应保存答案后再重复评分。"),
        ])
        self.flow("两组答案使用匿名ID", "人工盲标，不看自动评分", "GPT与Claude分别评价全部答案", "恢复来源标签，分组统计")
        self.say("\n漏判率矩阵（每格20份人工错误答案）：")
        self.say("答案来源       GPT升级版评委        Claude评委")
        for source in ("GPT", "Claude"):
            a = stats(self.rows, source, "GPT升级版")
            b = stats(self.rows, source, "Claude")
            self.say("{:<12} {:>2}/20 ({:.0%})          {:>2}/20 ({:.0%})".format(source, a[0], a[0]/a[1], b[0], b[0]/b[1]))
        self.say("四组的误杀率均为2/20。对角线漏判更高：同系列组合更容易放过错误。")
        selection = self.choose("你想检查哪格的逐条结果？", [
            ("GPT答案 × GPT升级版", "展开该格的模拟记录。"),
            ("GPT答案 × Claude", "展开该格的模拟记录。"),
            ("Claude答案 × GPT升级版", "展开该格的模拟记录。"),
            ("Claude答案 × Claude", "展开该格的模拟记录。"),
        ])
        source, judge = [("GPT", "GPT升级版"), ("GPT", "Claude"), ("Claude", "GPT升级版"), ("Claude", "Claude")][selection-1]
        for row in self.rows:
            if row["source"] == source and not row["human_pass"]:
                self.say("  {} | 人工：不通过 | 评委：{}".format(row["answer_id"], "通过 ← 漏判" if row["judgments"][judge] else "不通过"))
        self.say("这些记录是教学标签，不是80份完整自然语言答案，也没有做显著性检验。")

    def trace(self):
        self.say("你回看那个客户转移案例，不再只盯着0.94这个总分。")
        self.flow("证据：原负责人同意 AND 主管审批", "答案：主管审批后即可转移",
                  "错误判断路径：只提取‘需主管审批’，判为有证据", "遗漏检查：未比较完整操作前提",
                  "正确判断路径：识别‘审批后即可’放宽条件，判不通过")
        self.say("定位：偏差可能发生在事实拆解或证据蕴含判断，算平均分的代码仍然正确。")
        self.say("边界：Faithfulness不等于答案完整性；本例应结合Factual Correctness及必要条件检查。")
        self.choose("现在可以宣称什么？", [
            ("存在来源相关偏差迹象，继续独立验证", "共同漏判不自动等于家族偏好，还需排除长度、风格、难度和人工标签差异。"),
            ("GPT和Claude一定都偏爱自己", "结论过度。这里是构造的模拟模式，真实结论只能覆盖实际测过的模型版本和样本。"),
        ])

    def review(self):
        self.say("独立验证集：新问题，未用于调Prompt；每个来源10份错误、10份正确。")
        for source in ("GPT", "Claude"):
            for judge in ("GPT升级版", "Claude"):
                self.result(source, judge, self.validation)
        self.say("模拟结果重复出现同系列漏判更高的方向。样本小，不能声称已严格证明因果。")
        self.choose("你准备如何向面试官汇报？", [
            ("报告观察、对照、限制和改进措施", "结论保留适用范围；用实测记录和人工标准支撑。"),
            ("换Claude后RAG质量就提升了", "只换评委没有改变RAG答案；改善的是错误识别和版本选择依据。"),
        ])
        self.say("\n你走过的排查链：")
        self.flow("发现高分漏条件", "统一业务标准", "升级评委只部分改善", "换系列改善，检查误杀",
                  "换答案来源出现反转", "交叉盲评控制变量", "独立验证，限定结论")
        self.say("\n真实落地：\n  1. 生成和评委独立配置。\n  2. 用人工标签校准，跟踪漏判/误杀。\n  3. 高风险条件做规则检查及人工复核。\n  4. 升级评委后重评新旧版本，不能直接拼接历史分数。")


def main():
    parser = argparse.ArgumentParser(description=NOTICE)
    parser.add_argument("--auto", action="store_true", help="自动选择默认动作，完整播放")
    parser.add_argument("--no-animation", action="store_true", help="取消步骤间短暂停顿")
    parser.add_argument("--report", type=Path, help="另存本次选择和模拟记录为JSON（不覆盖已有文件）")
    args = parser.parse_args()
    if args.report and args.report.exists():
        parser.error("记录文件已存在，请换一个路径。")
    demo = Demo(auto=args.auto, animate=not args.no_animation)
    status = "completed"
    try:
        demo.run()
    except KeyboardInterrupt:
        status = "stopped"
        print("\n已退出，可重新运行从第一步开始。")
    finally:
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            with args.report.open("x", encoding="utf-8") as handle:
                json.dump({"notice": NOTICE, "status": status, "time": datetime.now().isoformat(),
                           "metric": METRIC, "events": demo.events, "exploration": demo.rows,
                           "validation": demo.validation}, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            print("学习记录已保存：{}".format(args.report))


if __name__ == "__main__":
    main()
