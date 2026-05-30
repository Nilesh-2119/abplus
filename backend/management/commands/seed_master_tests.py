from django.core.management.base import BaseCommand
from django.db import transaction
from backend.models import MasterTest, MasterTestParameter

class Command(BaseCommand):
    help = 'Seeds the database with standard clinical pathology master tests and parameters'

    def handle(self, *args, **options):
        self.stdout.write("Deleting existing master tests and parameters...")
        MasterTest.objects.all().delete()

        master_tests_data = [
            # ── HEMATOLOGY ──
            {
                "id": "MTEST-CBC",
                "name": "Complete Hemogram / CBC",
                "category": "Hematology",
                "code": "CBC",
                "tube_type": "EDTA",
                "tube_color": "Purple",
                "default_price": 350.00,
                "parameters": [
                    {"parameter_name": "Hemoglobin", "unit": "g/dL", "default_min": 12.0, "default_max": 17.0},
                    {"parameter_name": "WBC Count", "unit": "cells/mcL", "default_min": 4000.0, "default_max": 11000.0},
                    {"parameter_name": "Platelet Count", "unit": "lakhs/mcL", "default_min": 1.5, "default_max": 4.5},
                    {"parameter_name": "RBC Count", "unit": "million/mcL", "default_min": 4.5, "default_max": 5.9},
                    {"parameter_name": "PCV (Hematocrit)", "unit": "%", "default_min": 36.0, "default_max": 50.0},
                    {"parameter_name": "MCV", "unit": "fL", "default_min": 80.0, "default_max": 100.0},
                    {"parameter_name": "MCH", "unit": "pg", "default_min": 27.0, "default_max": 32.0},
                    {"parameter_name": "MCHC", "unit": "g/dL", "default_min": 32.0, "default_max": 36.0},
                ]
            },
            {
                "id": "MTEST-PSMP",
                "name": "PS for MP",
                "category": "Hematology",
                "code": "PSMP",
                "tube_type": "Slide",
                "tube_color": "Purple",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Malaria Parasite", "unit": "Presence", "default_min": 0.0, "default_max": 0.0}
                ]
            },
            {
                "id": "MTEST-WIDAL",
                "name": "Widal Test",
                "category": "Hematology",
                "code": "WIDAL",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 250.00,
                "parameters": [
                    {"parameter_name": "Salmonella Typhi O", "unit": "Titre", "default_min": 0.0, "default_max": 80.0},
                    {"parameter_name": "Salmonella Typhi H", "unit": "Titre", "default_min": 0.0, "default_max": 80.0},
                    {"parameter_name": "Salmonella Typhi AH", "unit": "Titre", "default_min": 0.0, "default_max": 80.0},
                    {"parameter_name": "Salmonella Typhi BH", "unit": "Titre", "default_min": 0.0, "default_max": 80.0}
                ]
            },
            {
                "id": "MTEST-BG",
                "name": "Blood Group",
                "category": "Hematology",
                "code": "BG",
                "tube_type": "EDTA",
                "tube_color": "Purple",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "ABO Grouping", "unit": "Text", "default_min": 0.0, "default_max": 0.0},
                    {"parameter_name": "Rh Factor", "unit": "Text", "default_min": 0.0, "default_max": 0.0}
                ]
            },
            {
                "id": "MTEST-BTCT",
                "name": "BT CT",
                "category": "Hematology",
                "code": "BTCT",
                "tube_type": "Capillary",
                "tube_color": "N/A",
                "default_price": 120.00,
                "parameters": [
                    {"parameter_name": "Bleeding Time", "unit": "mins", "default_min": 1.0, "default_max": 5.0},
                    {"parameter_name": "Clotting Time", "unit": "mins", "default_min": 3.0, "default_max": 9.0}
                ]
            },
            {
                "id": "MTEST-PTINR",
                "name": "PT INR / APTT",
                "category": "Hematology",
                "code": "PTINR",
                "tube_type": "Citrate",
                "tube_color": "Blue",
                "default_price": 450.00,
                "parameters": [
                    {"parameter_name": "Prothrombin Time", "unit": "secs", "default_min": 11.0, "default_max": 15.0},
                    {"parameter_name": "INR", "unit": "Ratio", "default_min": 0.8, "default_max": 1.2},
                    {"parameter_name": "APTT", "unit": "secs", "default_min": 25.0, "default_max": 35.0}
                ]
            },
            {
                "id": "MTEST-ESR",
                "name": "ESR",
                "category": "Hematology",
                "code": "ESR",
                "tube_type": "Citrate",
                "tube_color": "Black",
                "default_price": 120.00,
                "parameters": [
                    {"parameter_name": "ESR", "unit": "mm/1st hr", "default_min": 0.0, "default_max": 15.0}
                ]
            },
            {
                "id": "MTEST-MALAG",
                "name": "Rapid Malaria Ag",
                "category": "Hematology",
                "code": "MALAG",
                "tube_type": "EDTA",
                "tube_color": "Purple",
                "default_price": 280.00,
                "parameters": [
                    {"parameter_name": "P. falciparum Ag", "unit": "Index", "default_min": 0.0, "default_max": 0.9},
                    {"parameter_name": "P. vivax Ag", "unit": "Index", "default_min": 0.0, "default_max": 0.9}
                ]
            },
            {
                "id": "MTEST-DENGUE",
                "name": "Dengue NS1 / IgG / IgM",
                "category": "Hematology",
                "code": "DENGUE",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 650.00,
                "parameters": [
                    {"parameter_name": "Dengue NS1 Ag", "unit": "Index", "default_min": 0.0, "default_max": 0.9},
                    {"parameter_name": "Dengue IgG Ab", "unit": "Index", "default_min": 0.0, "default_max": 0.9},
                    {"parameter_name": "Dengue IgM Ab", "unit": "Index", "default_min": 0.0, "default_max": 0.9}
                ]
            },

            # ── DIABETES ──
            {
                "id": "MTEST-BSLR",
                "name": "BSL (R)",
                "category": "Diabetes",
                "code": "BSLR",
                "tube_type": "Fluoride",
                "tube_color": "Grey",
                "default_price": 80.00,
                "parameters": [
                    {"parameter_name": "Random Blood Glucose", "unit": "mg/dL", "default_min": 70.0, "default_max": 140.0}
                ]
            },
            {
                "id": "MTEST-BSLFPP",
                "name": "Blood Sugar F/PP",
                "category": "Diabetes",
                "code": "BSL-FPP",
                "tube_type": "Fluoride",
                "tube_color": "Grey",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Fasting Sugar", "unit": "mg/dL", "default_min": 70.0, "default_max": 100.0},
                    {"parameter_name": "Post-Prandial Sugar", "unit": "mg/dL", "default_min": 70.0, "default_max": 140.0}
                ]
            },
            {
                "id": "MTEST-HBA1C",
                "name": "HbA1c",
                "category": "Diabetes",
                "code": "HBA1C",
                "tube_type": "EDTA",
                "tube_color": "Purple",
                "default_price": 300.00,
                "parameters": [
                    {"parameter_name": "HbA1c (Glycated Hb)", "unit": "%", "default_min": 4.0, "default_max": 5.6},
                    {"parameter_name": "Avg Glucose", "unit": "mg/dL", "default_min": 70.0, "default_max": 114.0}
                ]
            },
            {
                "id": "MTEST-GTT",
                "name": "GTT",
                "category": "Diabetes",
                "code": "GTT",
                "tube_type": "Fluoride",
                "tube_color": "Grey",
                "default_price": 250.00,
                "parameters": [
                    {"parameter_name": "Fasting Glucose", "unit": "mg/dL", "default_min": 70.0, "default_max": 100.0},
                    {"parameter_name": "1Hr Glucose", "unit": "mg/dL", "default_min": 70.0, "default_max": 180.0},
                    {"parameter_name": "2Hr Glucose", "unit": "mg/dL", "default_min": 70.0, "default_max": 140.0}
                ]
            },

            # ── LIVER / BIOCHEMISTRY ──
            {
                "id": "MTEST-BILIRUBIN",
                "name": "Bilirubin",
                "category": "Liver / Biochemistry",
                "code": "BILI",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 200.00,
                "parameters": [
                    {"parameter_name": "Total Bilirubin", "unit": "mg/dL", "default_min": 0.1, "default_max": 1.2},
                    {"parameter_name": "Direct Bilirubin", "unit": "mg/dL", "default_min": 0.0, "default_max": 0.3},
                    {"parameter_name": "Indirect Bilirubin", "unit": "mg/dL", "default_min": 0.1, "default_max": 1.0}
                ]
            },
            {
                "id": "MTEST-UREA",
                "name": "Urea",
                "category": "Liver / Biochemistry",
                "code": "UREA",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 120.00,
                "parameters": [
                    {"parameter_name": "Blood Urea", "unit": "mg/dL", "default_min": 15.0, "default_max": 45.0}
                ]
            },
            {
                "id": "MTEST-CREATININE",
                "name": "Creatinine",
                "category": "Liver / Biochemistry",
                "code": "CREAT",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Serum Creatinine", "unit": "mg/dL", "default_min": 0.6, "default_max": 1.2}
                ]
            },
            {
                "id": "MTEST-URICACID",
                "name": "Uric Acid",
                "category": "Liver / Biochemistry",
                "code": "URIC",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Uric Acid", "unit": "mg/dL", "default_min": 3.5, "default_max": 7.2}
                ]
            },
            {
                "id": "MTEST-SGOT",
                "name": "SGOT",
                "category": "Liver / Biochemistry",
                "code": "SGOT",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "SGOT / AST", "unit": "U/L", "default_min": 8.0, "default_max": 48.0}
                ]
            },
            {
                "id": "MTEST-SGPT",
                "name": "SGPT",
                "category": "Liver / Biochemistry",
                "code": "SGPT",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "SGPT / ALT", "unit": "U/L", "default_min": 7.0, "default_max": 56.0}
                ]
            },
            {
                "id": "MTEST-ELECTROLYTES",
                "name": "Sr. Electrolytes",
                "category": "Liver / Biochemistry",
                "code": "ELECT",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 350.00,
                "parameters": [
                    {"parameter_name": "Sodium", "unit": "mmol/L", "default_min": 135.0, "default_max": 145.0},
                    {"parameter_name": "Potassium", "unit": "mmol/L", "default_min": 3.5, "default_max": 5.2},
                    {"parameter_name": "Chloride", "unit": "mmol/L", "default_min": 96.0, "default_max": 106.0}
                ]
            },
            {
                "id": "MTEST-AMYLASE",
                "name": "Sr. Amylase",
                "category": "Liver / Biochemistry",
                "code": "AMY",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 350.00,
                "parameters": [
                    {"parameter_name": "Serum Amylase", "unit": "U/L", "default_min": 25.0, "default_max": 125.0}
                ]
            },
            {
                "id": "MTEST-LIPASE",
                "name": "Sr. Lipase",
                "category": "Liver / Biochemistry",
                "code": "LIP",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 400.00,
                "parameters": [
                    {"parameter_name": "Serum Lipase", "unit": "U/L", "default_min": 10.0, "default_max": 140.0}
                ]
            },
            {
                "id": "MTEST-PROTEINS",
                "name": "Sr. Proteins",
                "category": "Liver / Biochemistry",
                "code": "PROT",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 200.00,
                "parameters": [
                    {"parameter_name": "Total Protein", "unit": "g/dL", "default_min": 6.0, "default_max": 8.3},
                    {"parameter_name": "Albumin", "unit": "g/dL", "default_min": 3.5, "default_max": 5.0},
                    {"parameter_name": "Globulin", "unit": "g/dL", "default_min": 2.0, "default_max": 3.5}
                ]
            },
            {
                "id": "MTEST-ALBUMIN",
                "name": "Albumin",
                "category": "Liver / Biochemistry",
                "code": "ALB",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 120.00,
                "parameters": [
                    {"parameter_name": "Albumin", "unit": "g/dL", "default_min": 3.5, "default_max": 5.0}
                ]
            },
            {
                "id": "MTEST-AGRATIO",
                "name": "A/G Ratio",
                "category": "Liver / Biochemistry",
                "code": "AGR",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Albumin Globulin Ratio", "unit": "Ratio", "default_min": 1.1, "default_max": 2.2}
                ]
            },
            {
                "id": "MTEST-ALP",
                "name": "Alkaline Phosphatase",
                "category": "Liver / Biochemistry",
                "code": "ALP",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 180.00,
                "parameters": [
                    {"parameter_name": "ALP", "unit": "U/L", "default_min": 44.0, "default_max": 147.0}
                ]
            },
            {
                "id": "MTEST-CALCIUM",
                "name": "Calcium",
                "category": "Liver / Biochemistry",
                "code": "CA",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Total Calcium", "unit": "mg/dL", "default_min": 8.5, "default_max": 10.2}
                ]
            },

            # ── HORMONES / THYROID ──
            {
                "id": "MTEST-TSH",
                "name": "TSH",
                "category": "Hormones / Thyroid",
                "code": "TSH",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 250.00,
                "parameters": [
                    {"parameter_name": "TSH", "unit": "uIU/mL", "default_min": 0.4, "default_max": 4.5}
                ]
            },
            {
                "id": "MTEST-AMH",
                "name": "AMH",
                "category": "Hormones / Thyroid",
                "code": "AMH",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 1800.00,
                "parameters": [
                    {"parameter_name": "AMH", "unit": "ng/mL", "default_min": 0.7, "default_max": 7.0}
                ]
            },
            {
                "id": "MTEST-E2",
                "name": "E2",
                "category": "Hormones / Thyroid",
                "code": "E2",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 650.00,
                "parameters": [
                    {"parameter_name": "Estradiol", "unit": "pg/mL", "default_min": 15.0, "default_max": 350.0}
                ]
            },
            {
                "id": "MTEST-PROLACTIN",
                "name": "Prolactine",
                "category": "Hormones / Thyroid",
                "code": "PRL",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 450.00,
                "parameters": [
                    {"parameter_name": "Prolactin", "unit": "ng/mL", "default_min": 4.0, "default_max": 23.0}
                ]
            },
            {
                "id": "MTEST-FSH",
                "name": "FSH",
                "category": "Hormones / Thyroid",
                "code": "FSH",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 450.00,
                "parameters": [
                    {"parameter_name": "FSH", "unit": "mIU/mL", "default_min": 1.5, "default_max": 12.4}
                ]
            },
            {
                "id": "MTEST-LH",
                "name": "LH",
                "category": "Hormones / Thyroid",
                "code": "LH",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 450.00,
                "parameters": [
                    {"parameter_name": "LH", "unit": "mIU/mL", "default_min": 1.7, "default_max": 8.6}
                ]
            },

            # ── INFECTION / IMMUNOLOGY ──
            {
                "id": "MTEST-HIV",
                "name": "HIV",
                "category": "Infection / Immunology",
                "code": "HIV",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 300.00,
                "parameters": [
                    {"parameter_name": "HIV I & II Antibody", "unit": "Ratio", "default_min": 0.0, "default_max": 0.9}
                ]
            },
            {
                "id": "MTEST-HBSAG",
                "name": "HBSAg",
                "category": "Infection / Immunology",
                "code": "HBSAG",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 250.00,
                "parameters": [
                    {"parameter_name": "HBsAg Antigen", "unit": "Ratio", "default_min": 0.0, "default_max": 0.9}
                ]
            },
            {
                "id": "MTEST-RA",
                "name": "RA",
                "category": "Infection / Immunology",
                "code": "RA",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 250.00,
                "parameters": [
                    {"parameter_name": "Rheumatoid Factor", "unit": "IU/mL", "default_min": 0.0, "default_max": 14.0}
                ]
            },
            {
                "id": "MTEST-ASO",
                "name": "ASO",
                "category": "Infection / Immunology",
                "code": "ASO",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 300.00,
                "parameters": [
                    {"parameter_name": "ASO Titre", "unit": "IU/mL", "default_min": 0.0, "default_max": 200.0}
                ]
            },
            {
                "id": "MTEST-CRP",
                "name": "CRP",
                "category": "Infection / Immunology",
                "code": "CRP",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 300.00,
                "parameters": [
                    {"parameter_name": "C-Reactive Protein", "unit": "mg/L", "default_min": 0.0, "default_max": 6.0}
                ]
            },

            # ── URINE / STOOL / FLUID ──
            {
                "id": "MTEST-URINE",
                "name": "Urine Examination",
                "category": "Urine / Stool / Fluid",
                "code": "URINE",
                "tube_type": "Urine Container",
                "tube_color": "Yellow",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Urine pH", "unit": "pH", "default_min": 4.5, "default_max": 8.0},
                    {"parameter_name": "Spec Gravity", "unit": "gravity", "default_min": 1.005, "default_max": 1.030},
                    {"parameter_name": "Urine Sugar", "unit": "Index", "default_min": 0.0, "default_max": 0.0},
                    {"parameter_name": "Urine Albumin", "unit": "Index", "default_min": 0.0, "default_max": 0.0},
                    {"parameter_name": "Pus Cells", "unit": "/HPF", "default_min": 0.0, "default_max": 5.0},
                    {"parameter_name": "Epithelial Cells", "unit": "/HPF", "default_min": 0.0, "default_max": 5.0}
                ]
            },
            {
                "id": "MTEST-STOOL",
                "name": "Stool Examination",
                "category": "Urine / Stool / Fluid",
                "code": "STOOL",
                "tube_type": "Stool Container",
                "tube_color": "Blue",
                "default_price": 150.00,
                "parameters": [
                    {"parameter_name": "Stool Consistency", "unit": "Text", "default_min": 0.0, "default_max": 0.0},
                    {"parameter_name": "Stool Colour", "unit": "Text", "default_min": 0.0, "default_max": 0.0},
                    {"parameter_name": "Ova/Cysts", "unit": "Presence", "default_min": 0.0, "default_max": 0.0}
                ]
            },
            {
                "id": "MTEST-FLUID",
                "name": "Fluid Examination",
                "category": "Urine / Stool / Fluid",
                "code": "FLUID",
                "tube_type": "Sterile Container",
                "tube_color": "Red",
                "default_price": 500.00,
                "parameters": [
                    {"parameter_name": "Fluid Protein", "unit": "g/dL", "default_min": 1.0, "default_max": 3.0},
                    {"parameter_name": "Fluid Glucose", "unit": "mg/dL", "default_min": 70.0, "default_max": 110.0},
                    {"parameter_name": "Total Cells", "unit": "cells/cu.mm", "default_min": 0.0, "default_max": 100.0}
                ]
            },
            {
                "id": "MTEST-CSF",
                "name": "CSF",
                "category": "Urine / Stool / Fluid",
                "code": "CSF",
                "tube_type": "Sterile Container",
                "tube_color": "Red",
                "default_price": 800.00,
                "parameters": [
                    {"parameter_name": "CSF Protein", "unit": "mg/dL", "default_min": 15.0, "default_max": 45.0},
                    {"parameter_name": "CSF Glucose", "unit": "mg/dL", "default_min": 50.0, "default_max": 80.0},
                    {"parameter_name": "CSF Chloride", "unit": "mmol/L", "default_min": 118.0, "default_max": 132.0}
                ]
            },
            {
                "id": "MTEST-UPT",
                "name": "Urine Pregnancy Test",
                "category": "Urine / Stool / Fluid",
                "code": "UPT",
                "tube_type": "Urine Container",
                "tube_color": "Yellow",
                "default_price": 120.00,
                "parameters": [
                    {"parameter_name": "hCG Pregnancy", "unit": "Presence", "default_min": 0.0, "default_max": 0.0}
                ]
            },

            # ── PROFILES ──
            {
                "id": "MTEST-LFT",
                "name": "Liver Function Test (LFT)",
                "category": "Profiles",
                "code": "LFT",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 900.00,
                "parameters": [
                    {"parameter_name": "Total Bilirubin", "unit": "mg/dL", "default_min": 0.1, "default_max": 1.2},
                    {"parameter_name": "Direct Bilirubin", "unit": "mg/dL", "default_min": 0.0, "default_max": 0.3},
                    {"parameter_name": "Indirect Bilirubin", "unit": "mg/dL", "default_min": 0.1, "default_max": 1.0},
                    {"parameter_name": "SGOT / AST", "unit": "U/L", "default_min": 8.0, "default_max": 48.0},
                    {"parameter_name": "SGPT / ALT", "unit": "U/L", "default_min": 7.0, "default_max": 56.0},
                    {"parameter_name": "Alkaline Phosphatase", "unit": "U/L", "default_min": 44.0, "default_max": 147.0},
                    {"parameter_name": "Total Protein", "unit": "g/dL", "default_min": 6.0, "default_max": 8.3},
                    {"parameter_name": "Albumin", "unit": "g/dL", "default_min": 3.5, "default_max": 5.0},
                    {"parameter_name": "Albumin Globulin Ratio", "unit": "Ratio", "default_min": 1.1, "default_max": 2.2}
                ]
            },
            {
                "id": "MTEST-LIPID",
                "name": "Lipid Profile",
                "category": "Profiles",
                "code": "LIPID",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 800.00,
                "parameters": [
                    {"parameter_name": "Total Cholesterol", "unit": "mg/dL", "default_min": 120.0, "default_max": 200.0},
                    {"parameter_name": "Triglycerides", "unit": "mg/dL", "default_min": 50.0, "default_max": 150.0},
                    {"parameter_name": "HDL Cholesterol", "unit": "mg/dL", "default_min": 40.0, "default_max": 60.0},
                    {"parameter_name": "LDL Cholesterol", "unit": "mg/dL", "default_min": 50.0, "default_max": 130.0},
                    {"parameter_name": "VLDL Cholesterol", "unit": "mg/dL", "default_min": 10.0, "default_max": 30.0}
                ]
            },
            {
                "id": "MTEST-KFT",
                "name": "KFT",
                "category": "Profiles",
                "code": "KFT",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 700.00,
                "parameters": [
                    {"parameter_name": "Blood Urea", "unit": "mg/dL", "default_min": 15.0, "default_max": 45.0},
                    {"parameter_name": "Serum Creatinine", "unit": "mg/dL", "default_min": 0.6, "default_max": 1.2},
                    {"parameter_name": "Uric Acid", "unit": "mg/dL", "default_min": 3.5, "default_max": 7.2},
                    {"parameter_name": "Total Calcium", "unit": "mg/dL", "default_min": 8.5, "default_max": 10.2}
                ]
            },
            {
                "id": "MTEST-RENAL",
                "name": "Renal Profile",
                "category": "Profiles",
                "code": "RENAL",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 750.00,
                "parameters": [
                    {"parameter_name": "Blood Urea", "unit": "mg/dL", "default_min": 15.0, "default_max": 45.0},
                    {"parameter_name": "Serum Creatinine", "unit": "mg/dL", "default_min": 0.6, "default_max": 1.2},
                    {"parameter_name": "Sodium", "unit": "mmol/L", "default_min": 135.0, "default_max": 145.0},
                    {"parameter_name": "Potassium", "unit": "mmol/L", "default_min": 3.5, "default_max": 5.2},
                    {"parameter_name": "Chloride", "unit": "mmol/L", "default_min": 96.0, "default_max": 106.0}
                ]
            },
            {
                "id": "MTEST-PREOP",
                "name": "Pre-Operative Profile",
                "category": "Profiles",
                "code": "PREOP",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 1500.00,
                "parameters": [
                    {"parameter_name": "Hemoglobin", "unit": "g/dL", "default_min": 12.0, "default_max": 17.0},
                    {"parameter_name": "Bleeding Time", "unit": "mins", "default_min": 1.0, "default_max": 5.0},
                    {"parameter_name": "Clotting Time", "unit": "mins", "default_min": 3.0, "default_max": 9.0},
                    {"parameter_name": "Random Blood Glucose", "unit": "mg/dL", "default_min": 70.0, "default_max": 140.0},
                    {"parameter_name": "HIV I & II Antibody", "unit": "Ratio", "default_min": 0.0, "default_max": 0.9},
                    {"parameter_name": "HBsAg Antigen", "unit": "Ratio", "default_min": 0.0, "default_max": 0.9}
                ]
            },
            {
                "id": "MTEST-COAG",
                "name": "Coagulation Profile",
                "category": "Profiles",
                "code": "COAG",
                "tube_type": "Citrate",
                "tube_color": "Blue",
                "default_price": 600.00,
                "parameters": [
                    {"parameter_name": "Prothrombin Time", "unit": "secs", "default_min": 11.0, "default_max": 15.0},
                    {"parameter_name": "INR", "unit": "Ratio", "default_min": 0.8, "default_max": 1.2},
                    {"parameter_name": "Platelet Count", "unit": "lakhs/mcL", "default_min": 1.5, "default_max": 4.5},
                    {"parameter_name": "APTT", "unit": "secs", "default_min": 25.0, "default_max": 35.0}
                ]
            },
            {
                "id": "MTEST-THYROID",
                "name": "Thyroid Profile",
                "category": "Profiles",
                "code": "THYROID",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 600.00,
                "parameters": [
                    {"parameter_name": "Triiodothyronine (T3)", "unit": "ng/dL", "default_min": 80.0, "default_max": 200.0},
                    {"parameter_name": "Thyroxine (T4)", "unit": "mcg/dL", "default_min": 4.5, "default_max": 12.0},
                    {"parameter_name": "TSH", "unit": "uIU/mL", "default_min": 0.4, "default_max": 4.5}
                ]
            },
            {
                "id": "MTEST-ANC",
                "name": "ANC Profile",
                "category": "Profiles",
                "code": "ANC",
                "tube_type": "Serum",
                "tube_color": "Red",
                "default_price": 1200.00,
                "parameters": [
                    {"parameter_name": "Hemoglobin", "unit": "g/dL", "default_min": 12.0, "default_max": 17.0},
                    {"parameter_name": "ABO Grouping", "unit": "Text", "default_min": 0.0, "default_max": 0.0},
                    {"parameter_name": "Fasting Sugar", "unit": "mg/dL", "default_min": 70.0, "default_max": 100.0},
                    {"parameter_name": "HIV I & II Antibody", "unit": "Ratio", "default_min": 0.0, "default_max": 0.9},
                    {"parameter_name": "HBsAg Antigen", "unit": "Ratio", "default_min": 0.0, "default_max": 0.9},
                    {"parameter_name": "Urine Albumin", "unit": "Index", "default_min": 0.0, "default_max": 0.0}
                ]
            },

            # ── PATHOLOGY / CYTOLOGY ──
            {
                "id": "MTEST-FNAC",
                "name": "FNAC",
                "category": "Pathology / Cytology",
                "code": "FNAC",
                "tube_type": "Aspirate",
                "tube_color": "N/A",
                "default_price": 750.00,
                "parameters": [
                    {"parameter_name": "FNAC Result", "unit": "Text", "default_min": 0.0, "default_max": 0.0}
                ]
            },
            {
                "id": "MTEST-PAP",
                "name": "PAP Smear",
                "category": "Pathology / Cytology",
                "code": "PAP",
                "tube_type": "Smear",
                "tube_color": "N/A",
                "default_price": 600.00,
                "parameters": [
                    {"parameter_name": "Epithelial Cells smear", "unit": "Text", "default_min": 0.0, "default_max": 0.0}
                ]
            }
        ]

        with transaction.atomic():
            for t_data in master_tests_data:
                m_test = MasterTest.objects.create(
                    id=t_data["id"],
                    name=t_data["name"],
                    category=t_data["category"],
                    code=t_data["code"],
                    tube_type=t_data["tube_type"],
                    tube_color=t_data["tube_color"],
                    default_price=t_data["default_price"],
                    is_active=True
                )
                for p_data in t_data["parameters"]:
                    MasterTestParameter.objects.create(
                        master_test=m_test,
                        parameter_name=p_data["parameter_name"],
                        unit=p_data["unit"],
                        default_min=p_data["default_min"],
                        default_max=p_data["default_max"]
                    )
        
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(master_tests_data)} master tests and parameters!"))
