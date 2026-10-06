from django.db import models
from django.utils.text import slugify


class TaxonomyBase(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True
        ordering = ["name"]

    def slug_source(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.slug_source())[:170]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Institution(TaxonomyBase):
    name = models.CharField(max_length=200, unique=True)
    short_name = models.CharField(max_length=30, blank=True)


class Course(TaxonomyBase):
    name = models.CharField(max_length=200, unique=True)
    field_of_study = models.CharField(max_length=150, blank=True)


class Skill(TaxonomyBase):
    name = models.CharField(max_length=100, unique=True)
    normalized_name = models.CharField(max_length=100, unique=True, editable=False)
    category = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        self.normalized_name = self.name.strip().lower()
        super().save(*args, **kwargs)


class Industry(TaxonomyBase):
    name = models.CharField(max_length=150, unique=True)

    class Meta(TaxonomyBase.Meta):
        verbose_name_plural = "industries"


class OpportunityType(TaxonomyBase):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)


class Location(TaxonomyBase):
    name = models.CharField(max_length=100, help_text="City / town")
    region = models.CharField(max_length=100)

    class Meta(TaxonomyBase.Meta):
        constraints = [models.UniqueConstraint(fields=["name", "region"], name="uniq_location_name_region")]
        ordering = ["region", "name"]

    def slug_source(self):
        return f"{self.name}-{self.region}"

    def __str__(self):
        return f"{self.name}, {self.region}"
