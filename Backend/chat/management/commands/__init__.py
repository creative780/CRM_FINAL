from django.core.management.base import BaseCommand
from chat.models import Prompt


class Command(BaseCommand):
    help = 'Seed bot prompts'

    def handle(self, *args, **options):
        prompts_data = [
            {
                'title': 'Product Search',
                'text': 'Help me find products in your catalog',
                'order': 1
            },
            {
                'title': 'Order Status',
                'text': 'Check the status of my order',
                'order': 2
            },
            {
                'title': 'Delivery Tracking',
                'text': 'Track my delivery',
                'order': 3
            },
            {
                'title': 'Account Help',
                'text': 'I need help with my account',
                'order': 4
            },
            {
                'title': 'General Support',
                'text': 'I need general support',
                'order': 5
            }
        ]

        for prompt_data in prompts_data:
            prompt, created = Prompt.objects.get_or_create(
                title=prompt_data['title'],
                defaults=prompt_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created prompt: {prompt.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Prompt already exists: {prompt.title}')
                )

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded bot prompts')
        )
