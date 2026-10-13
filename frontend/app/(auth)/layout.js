import Brand from "@/components/Brand";
import BrandPanel from "@/components/auth/BrandPanel";

export default function AuthLayout({ children }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />
      <section className="flex flex-col justify-center bg-white px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Brand className="mb-10" />
          {children}
        </div>
      </section>
    </main>
  );
}
