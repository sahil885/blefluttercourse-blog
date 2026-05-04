export default function CourseCallout() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-sky-900/40 to-blue-900/40 border border-sky-500/30 rounded-2xl p-8 my-12">
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative">
        <div className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Full Course Available
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">
          Ready to master BLE with Flutter?
        </h3>
        <p className="text-slate-300 mb-6 leading-relaxed max-w-lg">
          Go from zero to production-ready BLE apps. The complete course covers scanning, connecting,
          GATT communication, custom hardware, background processing, and deploying real BLE-powered
          Flutter apps.
        </p>

        <a
          href="https://blefluttercourse.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-400/35 hover:-translate-y-0.5"
        >
          Enroll in the Course
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
