def __custom_str__(self: type) -> str:
    return f"""{type(self).__name__}({
    ", ".join(
        f"{attr}={value!r}" for attr, value in self.__dict__.items()
        if not (attr.startswith("_") or callable(value))
    )
    })"""
