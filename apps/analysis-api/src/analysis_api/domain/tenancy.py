"""Family membership predicates that must match 002 RLS helpers."""

WRITE_ROLES = ("owner", "member")


def can_read_family(is_active: bool) -> bool:
    return is_active


def can_write_family(is_active: bool, member_role: str) -> bool:
    return is_active and member_role in WRITE_ROLES
