from app.tts import split_text


def test_short_text_is_not_split() -> None:
    assert split_text("Krótki tekst. Drugie zdanie.") == [
        "Krótki tekst. Drugie zdanie."
    ]


def test_long_polish_story_is_split_at_natural_boundaries() -> None:
    text = """Oto krótka baśń o poszukiwaniu własnej tożsamości:

    Dawno temu pod szczytem Płonącej Góry mieszkał smok imieniem Żar.
    Nie był typowym smokiem i nie potrafił zionąć ogniem. Pewnego dnia spotkał
    Rycerza Zimna, z którym wyruszył na poszukiwanie Wiecznego Płomienia.

    Czasem to, co uważasz za wadę, jest po prostu inną formą siły."""

    chunks = split_text(text, max_chars=120)

    assert len(chunks) > 1
    assert all(0 < len(chunk) <= 120 for chunk in chunks)
    assert " ".join(chunks).split() == " ".join(text.split()).split()


def test_oversized_sentence_is_split_on_words() -> None:
    text = " ".join(["bardzo"] * 80)

    chunks = split_text(text, max_chars=50)

    assert all(len(chunk) <= 50 for chunk in chunks)
    assert " ".join(chunks) == text
