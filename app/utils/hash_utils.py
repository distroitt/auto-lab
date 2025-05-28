import hashlib


def hash_file(filename):
    """Возвращает хеш переданного файла"""
    sha256 = hashlib.sha256()
    with open(filename, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256.update(byte_block)
    return sha256.hexdigest()
