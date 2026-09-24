# token_budget.py — 合成夹具（故意含一个缺陷，供 S 执行任务复现失败→修复→通过）
import re

def estimate_tokens(text: str) -> int:
    """按公司现行口径估算文本 token 数：
    中文字符每字计 1 token；非中文（ASCII）字符每 4 字符计 1 token（向上取整）。
    """
    cjk = len(re.findall(r'[\u4e00-\u9fff]', text))
    other = re.sub(r'[\u4e00-\u9fff]', '', text)
    ascii_tokens = (len(other) + 3) // 4  # ASCII 每 4 字符计 1 token，向上取整
    return cjk + ascii_tokens
