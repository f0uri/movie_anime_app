#!/usr/bin/env bash
# تفعيل بناء APK تلقائيًا على GitHub Actions.
#
# لماذا هذا السكربت؟ حساب الوكيل (bot) لا يملك صلاحية "workflows"،
# لذلك لا يستطيع دفع ملفات داخل .github/workflows بنفسه.
# شغّل هذا الأمر مرة واحدة من جذر المستودع:
#
#   bash ci/enable-apk-build.sh
#
# بعدها سيبدأ البناء تلقائيًا، وستجد رابط التنزيل المباشر في صفحة Releases.

set -euo pipefail

BRANCH="arena/01a011f7-movie-anime-app"

mkdir -p .github/workflows
cp ci/build-apk.yml .github/workflows/build-apk.yml

git add .github/workflows/build-apk.yml
git commit -m "تفعيل بناء APK عبر GitHub Actions"
git push origin "$BRANCH"

echo
echo "✅ تم الدفع. تابع البناء من هنا:"
echo "   https://github.com/f0uri/movie_anime_app/actions"
echo
echo "⏱️  يستغرق البناء ~5 دقائق. بعد انتهائه ستجد ملف APK جاهزًا للتنزيل في:"
echo "   https://github.com/f0uri/movie_anime_app/releases/latest"
