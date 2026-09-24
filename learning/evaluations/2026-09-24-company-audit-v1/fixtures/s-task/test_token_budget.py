# test_token_budget.py — 合成夹具的本地测试（当前应失败）
import unittest
from token_budget import estimate_tokens

class TestEstimateTokens(unittest.TestCase):
    def test_pure_cjk(self):
        self.assertEqual(estimate_tokens("你好世界"), 4)

    def test_mixed_cjk_ascii(self):
        # "你好 hello world"：2 个中文字 + 11 个 ASCII 字符（11/4 向上取整 = 3）→ 5
        self.assertEqual(estimate_tokens("你好 hello world"), 5)

    def test_pure_ascii(self):
        # 20 个 ASCII 字符 → 20/4 = 5
        self.assertEqual(estimate_tokens("abcdefghijklmnopqrst"), 5)

if __name__ == "__main__":
    unittest.main()
