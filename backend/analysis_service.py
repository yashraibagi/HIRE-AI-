import ats_scorer
import matcher
import parser as resume_parser
import role_classifier
import skill_gap


def analyze_resume_bytes(file_bytes: bytes, job_description: str) -> dict:
    resume_data = resume_parser.parse_resume(file_bytes)
    match_report = matcher.match(resume_data, job_description)
    ats_result = ats_scorer.calculate_ats(
        resume_text=resume_data["text"],
        jd_text=job_description,
        skills={
            "matched": match_report["matched_skills"],
            "total": len(match_report["jd_skills"]),
        },
    )
    gaps = skill_gap.analyze_gaps(
        match_report["matched_skills"], match_report["missing_skills"]
    )
    recommendations = skill_gap.generate_recommendations(
        ats_score=ats_result["score"],
        missing_skills=match_report["missing_skills"],
        experience_years=resume_data["experience_years"],
        
    )
    match_score = float(match_report["match_percent"])
    matched_skills = match_report["matched_skills"]
    missing_skills = match_report["missing_skills"]
    required_skill_count = len(match_report["jd_skills"])
    if required_skill_count:
        summary = (
            f"Matched {len(matched_skills)} of {required_skill_count} detected required skills. "
            f"Overall resume-to-job match is {match_score:.1f}% and ATS score is "
            f"{ats_result['score']:.1f}/100."
        )
    else:
        summary = (
            f"No explicit required skills were detected. Text, experience, and education "
            f"signals produce a {match_score:.1f}% resume-to-job match; ATS score is "
            f"{ats_result['score']:.1f}/100."
        )
    if missing_skills:
        summary += " Missing skills: " + ", ".join(missing_skills[:5]) + "."

    return {
        "ats_score": ats_result["score"],
        "grade": ats_result["grade"],
        "match_score": match_score,
        "match_percent": match_score,
        "matched_skills": matched_skills,
        "missing_skills": gaps,
        "summary": summary,
        "experience_years": resume_data["experience_years"],
        "education": resume_data["education"],
        "recommendations": recommendations,
        "feedback": ats_result["feedback"],
    }
