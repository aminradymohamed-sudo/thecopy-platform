"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useApp } from "../../context/AppContext";

import type { ViewType } from "../../types";

// ─── Sub-components ───

interface HeroActionsProps {
  onNavigate: (view: ViewType) => void;
}

function HeroActions({ onNavigate }: HeroActionsProps) {
  return (
    <div className="mb-12 flex max-w-full flex-wrap justify-center gap-4">
      <Button
        size="lg"
        onClick={() => onNavigate("studio")}
        className="max-w-full whitespace-normal break-words bg-blue-700 text-white hover:bg-blue-800"
      >
        🎬 جرب التطبيق
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="max-w-full whitespace-normal break-words"
        onClick={() => onNavigate("vocal")}
      >
        🎤 تمارين الصوت
      </Button>
      <Button
        size="lg"
        onClick={() => onNavigate("voicecoach")}
        className="max-w-full whitespace-normal break-words bg-purple-700 text-white hover:bg-purple-800"
      >
        🎙️ مدرب الصوت
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="max-w-full whitespace-normal break-words"
        onClick={() => onNavigate("webcam")}
      >
        👁️ التحليل البصري
      </Button>
      <Button
        size="lg"
        className="max-w-full whitespace-normal break-words bg-gradient-to-l from-red-700 to-pink-700 text-white hover:from-red-800 hover:to-pink-800"
        onClick={() =>
          (window.location.href = "/actorai-arabic/self-tape-suite")
        }
      >
        🎥 Self-Tape Suite
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="max-w-full whitespace-normal break-words"
        onClick={() => onNavigate("register")}
      >
        ابدأ الآن
      </Button>
    </div>
  );
}

interface FeatureGridProps {
  onNavigate: (view: ViewType) => void;
}

function FeatureGrid({ onNavigate }: FeatureGridProps) {
  return (
    <div className="mt-12 grid max-w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            تحليل النصوص
          </h3>
          <p className="text-white">
            تحليل عميق للأهداف والعقبات والمسارات العاطفية
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            شريك المشهد الذكي
          </h3>
          <p className="text-white">
            تدرب على المشاهد مع شريك ذكي يستجيب بطبيعية
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🎙️</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            مدرب الصوت اللحظي
          </h3>
          <p className="text-white/85">
            تحليل فوري: طبقة الصوت، الشدة، السرعة، الوقفات، التنفس
          </p>
          <Badge className="mt-3 bg-purple-700 text-white">جديد ✨</Badge>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🎤</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            تمارين الصوت
          </h3>
          <p className="text-white">تمارين نطق وتنفس واسقاط صوتي احترافية</p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-lg transition-shadow cursor-pointer bg-white/[0.04] border-white/8"
        onClick={() => onNavigate("webcam")}
      >
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">👁️</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            التحليل البصري
          </h3>
          <p className="text-white">
            تحليل اتجاه النظر والتعبيرات واستخدام المساحة
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-white/[0.04] border-white/8">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">📈</div>
          <h3 className="text-xl font-semibold mb-2 text-white">تتبع التقدم</h3>
          <p className="text-white">راقب نموك مع تحليلات شاملة ونصائح مخصصة</p>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-lg transition-shadow border-2 border-red-500/30 bg-gradient-to-br from-red-500/20 to-pink-500/20 cursor-pointer"
        onClick={() =>
          (window.location.href = "/actorai-arabic/self-tape-suite")
        }
      >
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🎥</div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            Self-Tape Suite
          </h3>
          <p className="text-white text-sm">
            موجه نص ذكي • تسجيل متعدد • مقارنة • ملاحظات ذكية • ملف جاهز للإرسال
          </p>
          <Badge className="mt-2 bg-red-700 text-white">جديد - المرحلة 3</Badge>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
        <CardContent className="p-6 text-center">
          <div className="text-5xl mb-4">🥽</div>
          <h3 className="text-xl font-semibold mb-2 text-white">تدريب AR/MR</h3>
          <p className="text-white/85">
            تجربة غامرة مع Vision Pro للتدريب الاحترافي
          </p>
          <Badge className="mt-3 bg-purple-700 text-white">جديد</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="mt-16">
      <h3 className="text-3xl font-bold text-white mb-8">كيف يعمل</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            1
          </div>
          <h4 className="text-xl font-semibold mb-2 text-white">ارفع نصك</h4>
          <p className="text-white">استورد أي نص بصيغة نصية</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            2
          </div>
          <h4 className="text-xl font-semibold mb-2 text-white">حلل وتدرب</h4>
          <p className="text-white">احصل على رؤى الذكاء الاصطناعي وتدرب</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            3
          </div>
          <h4 className="text-xl font-semibold mb-2 text-white">تتبع التقدم</h4>
          <p className="text-white">راقب التحسينات وأتقن حرفتك</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───

export function HomeView() {
  const { navigate } = useApp();

  return (
    <div className="max-w-full overflow-x-hidden py-16 text-center">
      <div className="mx-auto max-w-4xl min-w-0">
        <h2 className="mb-6 break-words text-5xl font-bold text-white">
          طور مهاراتك التمثيلية بالذكاء الاصطناعي
        </h2>
        <p className="mb-8 break-words text-xl text-white">
          أتقن فنك مع تحليل النصوص المدعوم بالذكاء الاصطناعي، وشركاء المشاهد
          الافتراضيين، وتحليلات الأداء
        </p>

        <HeroActions onNavigate={navigate} />

        <div className="text-8xl opacity-30 mb-12">🎭</div>

        <FeatureGrid onNavigate={navigate} />

        <HowItWorks />
      </div>
    </div>
  );
}
