"""
skill_gap.py
Maps missing skills to free learning resources and generates a prioritized
list of actionable recommendations based on the overall analysis.
"""

# ---------------------------------------------------------------------------
# 50+ skills mapped to a free learning resource URL.
# ---------------------------------------------------------------------------
RESOURCE_MAP = {
    "Python": "https://www.freecodecamp.org/learn/scientific-computing-with-python/",
    "Java": "https://www.codecademy.com/learn/learn-java",
    "JavaScript": "https://javascript.info/",
    "TypeScript": "https://www.typescriptlang.org/docs/handbook/intro.html",
    "C++": "https://www.learncpp.com/",
    "C#": "https://learn.microsoft.com/en-us/dotnet/csharp/",
    "Go": "https://go.dev/tour/welcome/1",
    "Rust": "https://doc.rust-lang.org/book/",
    "SQL": "https://mode.com/sql-tutorial/",
    "React": "https://react.dev/learn",
    "React.js": "https://react.dev/learn",
    "Vue.js": "https://vuejs.org/guide/introduction.html",
    "Angular": "https://angular.dev/tutorials",
    "Next.js": "https://nextjs.org/learn",
    "Redux": "https://redux.js.org/tutorials/essentials/part-1-overview-concepts",
    "HTML": "https://developer.mozilla.org/en-US/docs/Web/HTML",
    "CSS": "https://developer.mozilla.org/en-US/docs/Web/CSS",
    "Tailwind CSS": "https://tailwindcss.com/docs/installation",
    "Node.js": "https://nodejs.dev/en/learn/",
    "Express.js": "https://expressjs.com/en/starter/installing.html",
    "Django": "https://docs.djangoproject.com/en/stable/intro/tutorial01/",
    "Flask": "https://flask.palletsprojects.com/en/latest/quickstart/",
    "FastAPI": "https://fastapi.tiangolo.com/tutorial/",
    "GraphQL": "https://graphql.org/learn/",
    "REST API": "https://restfulapi.net/",
    "MySQL": "https://www.mysqltutorial.org/",
    "PostgreSQL": "https://www.postgresqltutorial.com/",
    "MongoDB": "https://learn.mongodb.com/",
    "Redis": "https://redis.io/docs/latest/develop/get-started/",
    "Firebase": "https://firebase.google.com/docs/guides",
    "AWS": "https://aws.amazon.com/getting-started/",
    "Azure": "https://learn.microsoft.com/en-us/training/azure/",
    "GCP": "https://cloud.google.com/docs/get-started",
    "Google Cloud": "https://cloud.google.com/docs/get-started",
    "Docker": "https://docs.docker.com/get-started/",
    "Kubernetes": "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
    "Jenkins": "https://www.jenkins.io/doc/tutorials/",
    "CI/CD": "https://www.freecodecamp.org/news/ci-cd-pipeline-explained/",
    "Terraform": "https://developer.hashicorp.com/terraform/tutorials",
    "Ansible": "https://docs.ansible.com/ansible/latest/getting_started/index.html",
    "Linux": "https://linuxjourney.com/",
    "Git": "https://learngitbranching.js.org/",
    "Machine Learning": "https://www.coursera.org/learn/machine-learning",
    "Deep Learning": "https://www.deeplearning.ai/courses/deep-learning-specialization/",
    "Natural Language Processing": "https://www.coursera.org/specializations/natural-language-processing",
    "NLP": "https://www.coursera.org/specializations/natural-language-processing",
    "Computer Vision": "https://www.pyimagesearch.com/start-here/",
    "TensorFlow": "https://www.tensorflow.org/tutorials",
    "PyTorch": "https://pytorch.org/tutorials/",
    "Keras": "https://keras.io/getting_started/",
    "scikit-learn": "https://scikit-learn.org/stable/tutorial/index.html",
    "Pandas": "https://pandas.pydata.org/docs/getting_started/index.html",
    "NumPy": "https://numpy.org/doc/stable/user/quickstart.html",
    "Tableau": "https://www.tableau.com/learn/training",
    "Power BI": "https://learn.microsoft.com/en-us/power-bi/fundamentals/",
    "Apache Spark": "https://spark.apache.org/docs/latest/quick-start.html",
    "Kafka": "https://kafka.apache.org/quickstart",
    "Airflow": "https://airflow.apache.org/docs/apache-airflow/stable/tutorial/",
    "Unit Testing": "https://realpython.com/python-testing/",
    "Selenium": "https://www.selenium.dev/documentation/",
    "Android": "https://developer.android.com/courses",
    "iOS": "https://developer.apple.com/tutorials/swiftui",
    "Flutter": "https://docs.flutter.dev/get-started/codelab",
    "React Native": "https://reactnative.dev/docs/getting-started",
    "Agile": "https://www.atlassian.com/agile",
    "Scrum": "https://www.scrum.org/resources/what-is-scrum",
    "Figma": "https://help.figma.com/hc/en-us/categories/360002051613-Getting-started",
    "System Design": "https://github.com/donnemartin/system-design-primer",
    "Data Structures": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
    "Algorithms": "https://www.coursera.org/specializations/algorithms",
}

_DEFAULT_RESOURCE = "https://roadmap.sh/"


def analyze_gaps(matched: list, missing: list) -> list:
    """
    Return a list of dicts for each missing skill, each including a free
    resource link (falls back to a general roadmap site if we don't have
    a specific mapping).
    """
    gaps = []
    for skill in missing:
        resource = RESOURCE_MAP.get(skill, _DEFAULT_RESOURCE)
        gaps.append({
            "skill": skill,
            "resource": resource,
        })
    return gaps


def generate_recommendations(
    ats_score: float,
    missing_skills: list,
    experience_years: float,
    predicted_role: str,
    confidence: float,
) -> list:
    """
    Build a prioritized list of recommendation dicts, each shaped as:
    {"type": str, "title": str, "detail": str, "action": str}
    """
    recommendations = []

    # --- ATS score based recommendations -----------------------------------
    if ats_score < 50:
        recommendations.append({
            "type": "ats",
            "title": "Improve your ATS compatibility",
            "detail": f"Your ATS score of {ats_score}/100 suggests many applicant "
                      "tracking systems may filter this resume out before a human sees it.",
            "action": "Add clear section headers (Experience, Education, Skills) and "
                      "mirror key phrases from the job description.",
        })
    elif ats_score < 75:
        recommendations.append({
            "type": "ats",
            "title": "Fine-tune your resume for ATS scanners",
            "detail": f"An ATS score of {ats_score}/100 is decent but leaves room to "
                      "improve keyword alignment and formatting.",
            "action": "Incorporate a few more exact keywords from the job description "
                      "into your experience bullet points.",
        })
    else:
        recommendations.append({
            "type": "ats",
            "title": "Your resume is ATS-friendly",
            "detail": f"An ATS score of {ats_score}/100 indicates strong compatibility "
                      "with automated screening systems.",
            "action": "Keep this structure and formatting for future applications.",
        })

    # --- Missing skills recommendations -------------------------------------
    if missing_skills:
        top_gaps = missing_skills[:5]
        recommendations.append({
            "type": "skills",
            "title": f"Close {len(missing_skills)} skill gap(s) for this role",
            "detail": "The job description mentions skills not found on your resume: "
                      + ", ".join(top_gaps) + (", and more." if len(missing_skills) > 5 else "."),
            "action": "Prioritize learning " + (top_gaps[0] if top_gaps else "the top missing skill")
                      + " first, then work through the rest using the linked resources.",
        })
    else:
        recommendations.append({
            "type": "skills",
            "title": "No major skill gaps detected",
            "detail": "Your resume already covers the key skills mentioned in the job description.",
            "action": "Consider adding a project or certification that demonstrates depth in these skills.",
        })

    # --- Experience based recommendations -----------------------------------
    if experience_years < 1:
        recommendations.append({
            "type": "experience",
            "title": "Highlight projects to offset limited experience",
            "detail": "Your resume shows less than a year of experience.",
            "action": "Add academic, freelance, or personal projects with measurable outcomes "
                      "to strengthen your experience section.",
        })
    elif experience_years < 3:
        recommendations.append({
            "type": "experience",
            "title": "Emphasize growth and ownership",
            "detail": f"With about {experience_years} year(s) of experience, "
                      "recruiters will look for signs of increasing responsibility.",
            "action": "Quantify impact in your bullet points (e.g., '% improvement', "
                      "'# users', '$ saved').",
        })

    # --- Role prediction based recommendation -------------------------------
    if confidence < 0.5:
        recommendations.append({
            "type": "role_fit",
            "title": "Your target role isn't clearly reflected yet",
            "detail": f"The model's best guess is '{predicted_role}' but with only "
                      f"{round(confidence * 100)}% confidence, meaning your resume reads as "
                      "a mix of multiple role types.",
            "action": "Tailor your summary and top bullet points to clearly signal the "
                      "specific role you're targeting.",
        })
    else:
        recommendations.append({
            "type": "role_fit",
            "title": f"Resume strongly aligns with '{predicted_role}'",
            "detail": f"The model is {round(confidence * 100)}% confident this resume "
                      f"reads as a {predicted_role} profile.",
            "action": "If you're applying to a different role type, adjust your "
                      "keywords and project highlights accordingly.",
        })

    return recommendations