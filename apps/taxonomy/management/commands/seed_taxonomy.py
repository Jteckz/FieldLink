from django.core.management.base import BaseCommand

from apps.taxonomy import models as m

INSTITUTIONS = [
    ("University of Dar es Salaam", "UDSM"), ("Dar es Salaam Institute of Technology", "DIT"),
    ("University of Dodoma", "UDOM"), ("Sokoine University of Agriculture", "SUA"),
    ("Mzumbe University", "MU"), ("Ardhi University", "ARU"),
    ("Muhimbili University of Health and Allied Sciences", "MUHAS"),
    ("Mbeya University of Science and Technology", "MUST"),
    ("Nelson Mandela African Institution of Science and Technology", "NM-AIST"),
    ("Open University of Tanzania", "OUT"), ("National Institute of Transport", "NIT"),
    ("Institute of Finance Management", "IFM"), ("College of Business Education", "CBE"),
    ("Tanzania Institute of Accountancy", "TIA"), ("Dar es Salaam University College of Education", "DUCE"),
    ("State University of Zanzibar", "SUZA"), ("St. Augustine University of Tanzania", "SAUT"),
]
COURSES = [
    ("Computer Science", "ICT"), ("Information Technology", "ICT"), ("Software Engineering", "ICT"),
    ("Computer Engineering", "Engineering"), ("Telecommunications Engineering", "Engineering"),
    ("Electrical Engineering", "Engineering"), ("Civil Engineering", "Engineering"),
    ("Mechanical Engineering", "Engineering"), ("Mining Engineering", "Engineering"),
    ("Accounting", "Business"), ("Finance", "Business"), ("Business Administration", "Business"),
    ("Marketing", "Business"), ("Economics", "Business"), ("Procurement and Supply Chain", "Business"),
    ("Law", "Law"), ("Medicine", "Health"), ("Nursing", "Health"), ("Pharmacy", "Health"),
    ("Agriculture", "Agriculture"), ("Agribusiness", "Agriculture"), ("Education", "Education"),
    ("Journalism and Mass Communication", "Media"), ("Statistics", "Science"),
    ("Mathematics", "Science"), ("Environmental Science", "Science"), ("Architecture", "Built Environment"),
    ("Quantity Surveying", "Built Environment"), ("Human Resource Management", "Business"),
]
SKILLS = [
    ("Python", "Programming"), ("Django", "Programming"), ("JavaScript", "Programming"),
    ("React", "Programming"), ("Java", "Programming"), ("PHP", "Programming"), ("C++", "Programming"),
    ("SQL", "Data"), ("PostgreSQL", "Data"), ("Data Analysis", "Data"), ("Microsoft Excel", "Data"),
    ("Networking", "ICT"), ("Linux", "ICT"), ("Cybersecurity", "ICT"), ("Cloud Computing", "ICT"),
    ("Graphic Design", "Design"), ("UI/UX Design", "Design"),
    ("Accounting Software", "Business"), ("Bookkeeping", "Business"), ("Project Management", "Business"),
    ("Customer Service", "Soft skills"), ("Communication", "Soft skills"), ("Teamwork", "Soft skills"),
    ("Report Writing", "Soft skills"), ("AutoCAD", "Engineering"), ("Electrical Wiring", "Engineering"),
    ("Research", "Soft skills"), ("Social Media Marketing", "Marketing"),
]
INDUSTRIES = [
    "Information Technology", "Telecommunications", "Banking and Finance", "Mining and Energy",
    "Agriculture", "Health", "Education", "Construction", "Manufacturing", "Tourism and Hospitality",
    "Transport and Logistics", "Government / Public Sector", "NGO / Development", "Media",
    "Retail and Trade", "Legal Services",
]
LOCATIONS = [
    ("Dar es Salaam", "Dar es Salaam"), ("Dodoma", "Dodoma"), ("Arusha", "Arusha"),
    ("Mwanza", "Mwanza"), ("Mbeya", "Mbeya"), ("Morogoro", "Morogoro"), ("Tanga", "Tanga"),
    ("Moshi", "Kilimanjaro"), ("Zanzibar City", "Zanzibar"), ("Iringa", "Iringa"),
    ("Bukoba", "Kagera"), ("Kigoma", "Kigoma"), ("Mtwara", "Mtwara"), ("Singida", "Singida"),
    ("Tabora", "Tabora"), ("Musoma", "Mara"), ("Songea", "Ruvuma"), ("Shinyanga", "Shinyanga"),
    ("Geita", "Geita"), ("Lindi", "Lindi"),
]
# (name, description, active in Phase 1)
OPPORTUNITY_TYPES = [
    ("Internship", "Structured work experience for students and graduates.", True),
    ("Field Study / Field Training", "Field-based practical learning placement.", True),
    ("Practical Training / Industrial Attachment", "Industrial attachment for practical credit.", True),
    ("Graduate Trainee", "Entry programme for recent graduates.", True),
    ("Apprenticeship", "Future: skills-based apprenticeship.", False),
    ("Volunteer Opportunity", "Future: volunteer placements.", False),
    ("Entry-Level Job", "Future: entry-level employment.", False),
]


class Command(BaseCommand):
    help = "Seed starter taxonomy data (idempotent)."

    def handle(self, *args, **options):
        for name, short in INSTITUTIONS:
            m.Institution.objects.get_or_create(name=name, defaults={"short_name": short})
        for name, field in COURSES:
            m.Course.objects.get_or_create(name=name, defaults={"field_of_study": field})
        for name, cat in SKILLS:
            m.Skill.objects.get_or_create(normalized_name=name.lower(), defaults={"name": name, "category": cat})
        for name in INDUSTRIES:
            m.Industry.objects.get_or_create(name=name)
        for city, region in LOCATIONS:
            m.Location.objects.get_or_create(name=city, region=region)
        for name, desc, active in OPPORTUNITY_TYPES:
            m.OpportunityType.objects.get_or_create(name=name, defaults={"description": desc, "is_active": active})
        self.stdout.write(self.style.SUCCESS("Taxonomy seeded."))
