"""
Seed script — creates initial super admin, demo tenant, tenant admin, and default dispositions.
Run: python -m app.utils.seed
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from app.database import async_session
from app.models.super_admin import SuperAdmin
from app.models.tenant import Tenant, TenantPlan, TenantStatus
from app.models.user import User, UserRole
from app.models.disposition import DispositionTemplate, DEFAULT_DISPOSITIONS
from app.services.auth_service import hash_password


async def seed():
    async with async_session() as db:
        # 1. Super Admin
        existing = await db.execute(select(SuperAdmin).where(SuperAdmin.email == "superadmin@nmc.com"))
        if not existing.scalar_one_or_none():
            sa = SuperAdmin(
                email="superadmin@nmc.com",
                password_hash=hash_password("SuperAdmin@123"),
                full_name="NMC Super Admin",
                is_active=True,
            )
            db.add(sa)
            await db.flush()
            super_admin_id = sa.id
            print("[OK] Super Admin created: superadmin@nmc.com / SuperAdmin@123")
        else:
            result = await db.execute(select(SuperAdmin).where(SuperAdmin.email == "superadmin@nmc.com"))
            sa = result.scalar_one()
            super_admin_id = sa.id
            print("[INFO] Super Admin already exists: superadmin@nmc.com")

        # 2. Demo Tenant
        existing_t = await db.execute(select(Tenant).where(Tenant.slug == "nmc-demo"))
        tenant = existing_t.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                name="NMC Demo",
                slug="nmc-demo",
                status=TenantStatus.active,
                plan=TenantPlan.pro,
                max_agents=25,
                max_campaigns=10,
                created_by_super_admin_id=super_admin_id,
            )
            db.add(tenant)
            await db.flush()
            print("[OK] Tenant created: NMC Demo (slug: nmc-demo)")
        else:
            print("[INFO] Tenant already exists: nmc-demo")

        # 3. Tenant Admin user
        existing_u = await db.execute(
            select(User).where(User.tenant_id == tenant.id, User.email == "admin@nmc-demo.com")
        )
        if not existing_u.scalar_one_or_none():
            admin_user = User(
                tenant_id=tenant.id,
                email="admin@nmc-demo.com",
                password_hash=hash_password("Admin@123"),
                full_name="Demo Admin",
                role=UserRole.tenant_admin,
                is_active=True,
            )
            db.add(admin_user)
            await db.flush()
            print("[OK] Tenant Admin created: admin@nmc-demo.com / Admin@123")
        else:
            print("[INFO] Tenant Admin already exists: admin@nmc-demo.com")

        # 4. Demo Manager
        existing_mgr = await db.execute(
            select(User).where(User.tenant_id == tenant.id, User.email == "manager@nmc-demo.com")
        )
        if not existing_mgr.scalar_one_or_none():
            mgr = User(
                tenant_id=tenant.id,
                email="manager@nmc-demo.com",
                password_hash=hash_password("Manager@123"),
                full_name="Demo Manager",
                role=UserRole.manager,
                is_active=True,
            )
            db.add(mgr)
            print("[OK] Manager created: manager@nmc-demo.com / Manager@123")

        # 5. Demo Agent
        existing_agent = await db.execute(
            select(User).where(User.tenant_id == tenant.id, User.email == "agent@nmc-demo.com")
        )
        if not existing_agent.scalar_one_or_none():
            agent = User(
                tenant_id=tenant.id,
                email="agent@nmc-demo.com",
                password_hash=hash_password("Agent@123"),
                full_name="Demo Agent",
                role=UserRole.agent,
                phone="+91 9876543210",
                skills=["english", "hindi", "sales"],
                max_concurrent_calls=3,
                is_active=True,
            )
            db.add(agent)
            print("[OK] Agent created: agent@nmc-demo.com / Agent@123")

        # 6. Default disposition templates
        existing_disp = await db.execute(
            select(DispositionTemplate).where(DispositionTemplate.tenant_id == tenant.id)
        )
        if not existing_disp.scalars().first():
            for d in DEFAULT_DISPOSITIONS:
                dt = DispositionTemplate(
                    tenant_id=tenant.id,
                    name=d["name"],
                    category=d["category"],
                    sort_order=d["sort_order"],
                    is_system=True,
                )
                db.add(dt)
            print(f"[OK] Default dispositions seeded ({len(DEFAULT_DISPOSITIONS)} templates)")
        else:
            print("[INFO] Dispositions already exist for this tenant")

        await db.commit()
        print("\nSeed complete!")
        print("=" * 50)
        print("Super Admin:  superadmin@nmc.com / SuperAdmin@123")
        print("Tenant Admin: admin@nmc-demo.com / Admin@123  (workspace: nmc-demo)")
        print("Manager:      manager@nmc-demo.com / Manager@123")
        print("Agent:        agent@nmc-demo.com / Agent@123")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
