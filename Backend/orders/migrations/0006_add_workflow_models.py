# Generated manually for workflow enhancements

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_add_sales_person_field'),
    ]

    operations = [
        # Update Order model status field max_length
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('sent_to_sales', 'Sent to Sales'),
                    ('sent_to_designer', 'Sent to Designer'),
                    ('sent_for_approval', 'Sent for Approval'),
                    ('sent_to_production', 'Sent to Production'),
                    ('sent_to_admin', 'Sent to Admin'),
                    ('getting_ready', 'Getting Ready'),
                    ('sent_for_delivery', 'Sent for Delivery'),
                    ('delivered', 'Delivered'),
                    ('new', 'New'),
                    ('active', 'Active'),
                    ('completed', 'Completed'),
                ],
                default='draft',
                max_length=30
            ),
        ),
        
        # Add workflow tracking fields to Order model
        migrations.AddField(
            model_name='order',
            name='assigned_sales_person',
            field=models.CharField(blank=True, help_text='Sales person handling this order', max_length=255),
        ),
        migrations.AddField(
            model_name='order',
            name='assigned_designer',
            field=models.CharField(blank=True, help_text='Designer assigned to this order', max_length=255),
        ),
        migrations.AddField(
            model_name='order',
            name='assigned_production_person',
            field=models.CharField(blank=True, help_text='Production person assigned', max_length=255),
        ),
        migrations.AddField(
            model_name='order',
            name='internal_notes',
            field=models.TextField(blank=True, help_text='Internal notes visible only to admin'),
        ),
        
        # Create DesignApproval model
        migrations.CreateModel(
            name='DesignApproval',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('designer', models.CharField(help_text='Designer who created this work', max_length=255)),
                ('sales_person', models.CharField(help_text='Sales person who sent the order', max_length=255)),
                ('approval_status', models.CharField(
                    choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
                    default='pending',
                    max_length=20
                )),
                ('design_files_manifest', models.JSONField(blank=True, default=list, help_text='List of design file metadata')),
                ('approval_notes', models.TextField(blank=True, help_text='Notes from designer when requesting approval')),
                ('rejection_reason', models.TextField(blank=True, help_text='Reason if rejected by sales')),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='design_approvals', to='orders.order')),
            ],
            options={
                'ordering': ['-submitted_at'],
            },
        ),
        
        # Create ProductMachineAssignment model
        migrations.CreateModel(
            name='ProductMachineAssignment',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('product_name', models.CharField(max_length=255)),
                ('product_sku', models.CharField(blank=True, max_length=100)),
                ('product_quantity', models.PositiveIntegerField()),
                ('machine_id', models.CharField(help_text='Machine identifier', max_length=100)),
                ('machine_name', models.CharField(max_length=255)),
                ('estimated_time_minutes', models.PositiveIntegerField(help_text='Estimated production time')),
                ('start_time', models.DateTimeField(blank=True, null=True)),
                ('expected_completion_time', models.DateTimeField(blank=True, null=True)),
                ('actual_completion_time', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[('queued', 'Queued'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('on_hold', 'On Hold')],
                    default='queued',
                    max_length=20
                )),
                ('assigned_by', models.CharField(help_text='Production person who assigned this', max_length=255)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='machine_assignments', to='orders.order')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        
        # Create OrderFile model
        migrations.CreateModel(
            name='OrderFile',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('file', models.FileField(upload_to='order_files/%Y/%m/%d/')),
                ('file_name', models.CharField(max_length=255)),
                ('file_type', models.CharField(
                    choices=[
                        ('requirement', 'Requirement'), ('design', 'Design'), ('proof', 'Proof'),
                        ('final', 'Final'), ('approval', 'Approval'), ('delivery', 'Delivery'), ('other', 'Other')
                    ],
                    max_length=20
                )),
                ('file_size', models.PositiveIntegerField(help_text='File size in bytes')),
                ('mime_type', models.CharField(max_length=100)),
                ('uploaded_by', models.CharField(help_text='Username of uploader', max_length=255)),
                ('uploaded_by_role', models.CharField(help_text='Role of uploader', max_length=50)),
                ('stage', models.CharField(help_text='Which stage this file belongs to', max_length=50)),
                ('visible_to_roles', models.JSONField(default=list, help_text='List of roles that can view this file')),
                ('description', models.TextField(blank=True)),
                ('product_related', models.CharField(blank=True, help_text='Related product name/SKU if applicable', max_length=255)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='files', to='orders.order')),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='designapproval',
            index=models.Index(fields=['order', 'approval_status'], name='orders_desi_order_i_80f414_idx'),
        ),
        migrations.AddIndex(
            model_name='designapproval',
            index=models.Index(fields=['sales_person', 'approval_status'], name='orders_desi_sales_p_1e8c7a_idx'),
        ),
        migrations.AddIndex(
            model_name='designapproval',
            index=models.Index(fields=['designer'], name='orders_desi_designe_b3a7f1_idx'),
        ),
        migrations.AddIndex(
            model_name='productmachineassignment',
            index=models.Index(fields=['order', 'status'], name='orders_prod_order_i_d2f3a1_idx'),
        ),
        migrations.AddIndex(
            model_name='productmachineassignment',
            index=models.Index(fields=['machine_id', 'status'], name='orders_prod_machine_e4b2c9_idx'),
        ),
        migrations.AddIndex(
            model_name='productmachineassignment',
            index=models.Index(fields=['expected_completion_time'], name='orders_prod_expecte_f7d1e8_idx'),
        ),
        migrations.AddIndex(
            model_name='orderfile',
            index=models.Index(fields=['order', 'file_type'], name='orders_orde_order_i_a1c2d3_idx'),
        ),
        migrations.AddIndex(
            model_name='orderfile',
            index=models.Index(fields=['order', 'stage'], name='orders_orde_order_i_b2e3f4_idx'),
        ),
        migrations.AddIndex(
            model_name='orderfile',
            index=models.Index(fields=['uploaded_by'], name='orders_orde_uploade_c3f4e5_idx'),
        ),
    ]



