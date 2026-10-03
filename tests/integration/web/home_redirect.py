from urllib.parse import urlparse


def is_marketing_home(location: str) -> bool:
    """Unsigned desk URLs redirect to marketing `/`, not `/login`."""
    path = urlparse(location).path or "/"
    return path == "/"
