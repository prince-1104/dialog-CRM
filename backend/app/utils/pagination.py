from typing import TypeVar, Generic, List, Optional
from pydantic import BaseModel

T = TypeVar("T")

class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int

def paginate(items: List[T], total: int, page: int, size: int) -> Page[T]:
    pages = (total + size - 1) // size if size > 0 else 0
    return Page(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )
