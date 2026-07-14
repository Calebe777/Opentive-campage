from app.html_validation import review_html, sanitize_email_html


def test_sanitizer_removes_dangerous_content() -> None:
    result = sanitize_email_html(
        '<table><tr><td><script>alert(1)</script><a href="javascript:alert(1)">A</a></td></tr></table>'
    )
    assert "<script" not in result
    assert "javascript:" not in result


def test_sanitizer_preserves_safe_inline_css() -> None:
    result = sanitize_email_html(
        '<table><tr><td style="color: red; position: fixed">Olá</td></tr></table>'
    )
    assert "color: red" in result
    assert "position" not in result


def test_review_reports_missing_requirements() -> None:
    warnings = review_html("<html><body><p>Olá</p></body></html>")
    assert any("tabelas" in warning for warning in warnings)
    assert any("descadastro" in warning for warning in warnings)
