from backend.rag.store import cosine_from_atlas


def test_atlas_score_converts_back_to_cosine():
    # Atlas: (1 + cos) / 2.  Observed on the real database: 0.8473 for a Parents Day match.
    assert cosine_from_atlas(1.0) == 1.0
    assert cosine_from_atlas(0.5) == 0.0
    assert round(cosine_from_atlas(0.8473), 3) == 0.695
