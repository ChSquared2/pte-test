from google import genai
import json
import os

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
MODEL = "gemini-2.0-flash"


def _parse_json_response(text: str) -> dict:
    """Extract JSON from Gemini response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(text)


def _generate(prompt: str) -> str:
    response = client.models.generate_content(model=MODEL, contents=prompt)
    return response.text


def score_essay(essay_text: str, prompt: str) -> dict:
    scoring_prompt = f"""You are a PTE Academic exam scorer. Score this essay strictly and fairly.

Essay prompt: {prompt}
Student's essay: {essay_text}

Word count: {len(essay_text.split())}

Score each criterion from 0 to 5 (0=no response, 1=very poor, 2=poor, 3=adequate, 4=good, 5=excellent):
1. content - relevance to topic, development of ideas
2. form - word count 200-300, essay structure (intro/body/conclusion)
3. grammar - accuracy and range of grammatical structures
4. vocabulary - range and accuracy of word choice
5. spelling - accuracy of spelling
6. written_discourse - coherence, cohesion, logical flow
7. general_linguistic_range - overall language ability

Respond ONLY with valid JSON, no other text:
{{"content": X, "form": X, "grammar": X, "vocabulary": X, "spelling": X, "written_discourse": X, "general_linguistic_range": X, "feedback": "2-3 sentences of specific, constructive feedback"}}"""

    try:
        text = _generate(scoring_prompt)
        scores = _parse_json_response(text)
        criteria = ["content", "form", "grammar", "vocabulary", "spelling", "written_discourse", "general_linguistic_range"]
        total = sum(scores.get(c, 0) for c in criteria)
        max_total = len(criteria) * 5
        return {
            "score_details": {c: scores.get(c, 0) for c in criteria},
            "total_score": round((total / max_total) * 100, 1),
            "max_score": 100,
            "feedback": scores.get("feedback", ""),
        }
    except Exception as e:
        return {"score_details": {"error": str(e)}, "total_score": 0, "max_score": 100, "feedback": f"Scoring unavailable: {str(e)}"}


def score_summarize_written_text(summary: str, original_passage: str) -> dict:
    scoring_prompt = f"""You are a PTE Academic exam scorer. Score this "Summarize Written Text" response.
The student must write ONE sentence (5-75 words) summarizing the passage.

Original passage: {original_passage}
Student's summary: {summary}

Word count: {len(summary.split())}

Score each criterion from 0 to 2:
1. content - captures main idea and key supporting points
2. form - single complete sentence, 5-75 words
3. grammar - grammatical accuracy
4. vocabulary - appropriate academic vocabulary

Respond ONLY with valid JSON:
{{"content": X, "form": X, "grammar": X, "vocabulary": X, "feedback": "1-2 sentences of feedback"}}"""

    try:
        text = _generate(scoring_prompt)
        scores = _parse_json_response(text)
        criteria = ["content", "form", "grammar", "vocabulary"]
        total = sum(scores.get(c, 0) for c in criteria)
        max_total = len(criteria) * 2
        return {
            "score_details": {c: scores.get(c, 0) for c in criteria},
            "total_score": round((total / max_total) * 100, 1),
            "max_score": 100,
            "feedback": scores.get("feedback", ""),
        }
    except Exception as e:
        return {"score_details": {"error": str(e)}, "total_score": 0, "max_score": 100, "feedback": f"Scoring unavailable: {str(e)}"}


def score_summarize_spoken_text(summary: str, transcript: str) -> dict:
    scoring_prompt = f"""You are a PTE Academic exam scorer. Score this "Summarize Spoken Text" response.
The student listened to audio and must write a 50-70 word summary.

Audio transcript: {transcript}
Student's summary: {summary}

Word count: {len(summary.split())}

Score each criterion from 0 to 2:
1. content - captures main ideas and supporting points from the audio
2. form - 50-70 words, complete sentences
3. grammar - grammatical accuracy
4. vocabulary - appropriate vocabulary
5. spelling - spelling accuracy

Respond ONLY with valid JSON:
{{"content": X, "form": X, "grammar": X, "vocabulary": X, "spelling": X, "feedback": "1-2 sentences of feedback"}}"""

    try:
        text = _generate(scoring_prompt)
        scores = _parse_json_response(text)
        criteria = ["content", "form", "grammar", "vocabulary", "spelling"]
        total = sum(scores.get(c, 0) for c in criteria)
        max_total = len(criteria) * 2
        return {
            "score_details": {c: scores.get(c, 0) for c in criteria},
            "total_score": round((total / max_total) * 100, 1),
            "max_score": 100,
            "feedback": scores.get("feedback", ""),
        }
    except Exception as e:
        return {"score_details": {"error": str(e)}, "total_score": 0, "max_score": 100, "feedback": f"Scoring unavailable: {str(e)}"}


def _upload_audio(audio_path: str):
    """Upload audio file to Gemini and wait for ACTIVE state."""
    import time
    mime = "audio/webm" if audio_path.endswith(".webm") else "audio/wav"
    audio_file = client.files.upload(file=audio_path, config={"mime_type": mime})
    for _ in range(15):
        if audio_file.state.name == "ACTIVE":
            break
        time.sleep(2)
        audio_file = client.files.get(name=audio_file.name)
    return audio_file


def _score_speaking_strict(audio_path: str, question_type: str, reference_text: str) -> dict:
    """Strict word-level scoring for Read Aloud and Repeat Sentence."""
    ref_words = reference_text.split()
    total_words = len(ref_words)

    task_desc = "read the following text aloud" if question_type == "read_aloud" else "repeat the following sentence"

    # Build the word list for the prompt
    word_list = ", ".join(f'"{w}"' for w in ref_words)

    scoring_prompt = f"""You are a STRICT PTE Academic speaking scorer performing word-level analysis.

The student was asked to {task_desc}:
"{reference_text}"

Total words in reference: {total_words}
The words are (in order): [{word_list}]

INSTRUCTIONS - Follow these steps EXACTLY:
1. TRANSCRIBE: Listen carefully and transcribe EXACTLY what the student said. Do NOT assume they said words they didn't say.
2. For EACH word in the reference text (in order), determine:
   - "correct" = the student said this word clearly and correctly
   - "wrong" = the student attempted this word but mispronounced it
   - "missing" = the student did NOT say this word at all
3. Build the "word_results" array with one entry per reference word, in order.
4. Count how many are "correct", "wrong", and "missing".
5. The content score is simply: words_correct out of {total_words} (e.g., 5 correct out of 30 = score "5/30")
6. Score pronunciation (0-5): clarity of the words they DID say.
7. Score oral_fluency (0-5): rhythm, pace, hesitations.

Respond ONLY with valid JSON (no other text):
{{
  "word_results": [
    {{"word": "first_word", "status": "correct|wrong|missing"}},
    {{"word": "second_word", "status": "correct|wrong|missing"}}
  ],
  "words_correct": N,
  "words_wrong": N,
  "words_missing": N,
  "pronunciation": X,
  "oral_fluency": X,
  "feedback": "Brief feedback about pronunciation and fluency."
}}"""

    try:
        audio_file = _upload_audio(audio_path)
        response = client.models.generate_content(
            model=MODEL,
            contents=[scoring_prompt, audio_file],
        )
        scores = _parse_json_response(response.text)

        words_correct = scores.get("words_correct", 0)
        words_wrong = scores.get("words_wrong", 0)
        words_missing = scores.get("words_missing", 0)
        word_results = scores.get("word_results", [])

        # Content score = correct / total as percentage
        content_pct = (words_correct / total_words * 100) if total_words > 0 else 0
        # Pronunciation and fluency from Gemini (0-5 scale -> percentage)
        pron = scores.get("pronunciation", 0)
        fluency = scores.get("oral_fluency", 0)
        pron_pct = pron / 5 * 100
        fluency_pct = fluency / 5 * 100
        # Overall: weighted average (content 60%, pronunciation 20%, fluency 20%)
        overall = content_pct * 0.6 + pron_pct * 0.2 + fluency_pct * 0.2

        return {
            "score_details": {
                "words_correct": words_correct,
                "words_wrong": words_wrong,
                "words_missing": words_missing,
                "words_expected": total_words,
                "word_results": word_results,
                "pronunciation": pron,
                "oral_fluency": fluency,
            },
            "total_score": round(overall, 1),
            "max_score": 100,
            "feedback": scores.get("feedback", ""),
        }
    except Exception as e:
        return {"score_details": {"error": str(e)}, "total_score": 0, "max_score": 100, "feedback": f"Scoring unavailable: {str(e)}"}


def score_speaking(audio_path: str, question_type: str, reference_text: str = "") -> dict:
    """Score a speaking response using Gemini multimodal (audio input)."""

    # For question types with exact reference text, use strict word-level analysis
    if question_type in ("read_aloud", "repeat_sentence") and reference_text:
        return _score_speaking_strict(audio_path, question_type, reference_text)

    # For open-ended speaking types, use general scoring
    type_instructions = {
        "describe_image": "The student described an image. Score the quality, detail, and organization of the description.",
        "retell_lecture": f"The lecture content was: '{reference_text}'. Score how completely and accurately the student retold the key points. If they only mentioned a few points, content should be low (1-2). If they covered most points, content should be higher (3-5).",
        "answer_short_question": f"The expected answer is: '{reference_text}'. Give content=5 ONLY if they said this exact word or a clear synonym. Give content=0 if they said something wrong or nothing.",
        "summarize_group_discussion": f"The discussion content was: '{reference_text}'. Score how well the student summarized all key points. Missing major points should result in low content scores.",
        "respond_to_situation": f"The situation was: '{reference_text}'. Score the appropriateness, completeness, and relevance of the response.",
    }

    instruction = type_instructions.get(question_type, "Score this speaking response.")

    scoring_prompt = f"""You are a STRICT PTE Academic speaking scorer. Do NOT be generous.
{instruction}

Score on these criteria (each 0-5, where 0=no response, 5=native-like):
1. content - accuracy, completeness, relevance. Be STRICT: missing key information = low score
2. pronunciation - clarity, phoneme accuracy, word stress, intonation
3. oral_fluency - rhythm, pacing, no hesitations or unnatural pauses

Respond ONLY with valid JSON:
{{"content": X, "pronunciation": X, "oral_fluency": X, "feedback": "2-3 sentences of specific feedback listing what was missing or wrong"}}"""

    try:
        audio_file = _upload_audio(audio_path)
        response = client.models.generate_content(
            model=MODEL,
            contents=[scoring_prompt, audio_file],
        )
        scores = _parse_json_response(response.text)
        criteria = ["content", "pronunciation", "oral_fluency"]
        total = sum(scores.get(c, 0) for c in criteria)
        max_total = len(criteria) * 5
        return {
            "score_details": {c: scores.get(c, 0) for c in criteria},
            "total_score": round((total / max_total) * 100, 1),
            "max_score": 100,
            "feedback": scores.get("feedback", ""),
        }
    except Exception as e:
        return {"score_details": {"error": str(e)}, "total_score": 0, "max_score": 100, "feedback": f"Scoring unavailable: {str(e)}"}
