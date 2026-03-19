import { useState } from 'react'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ActiveTab } from '@/types/pdf'
import { MergePage } from '@/features/merge/MergePage'
import { SplitPage } from '@/features/split/SplitPage'
import { ExtractPage } from '@/features/extract/ExtractPage'
import { DeletePage } from '@/features/delete/DeletePage'
import { RotatePage } from '@/features/rotate/RotatePage'
import { ReorderPage } from '@/features/reorder/ReorderPage'
import { PasswordProtectPage } from '@/features/encrypt/PasswordProtectPage'
import { ImageToPdfPage } from '@/features/image-to-pdf/ImageToPdfPage'

const tabs: { id: ActiveTab; label: string }[] = [
  { id: 'merge',   label: '병합 (Merge)'           },
  { id: 'split',   label: '분할 (Split)'           },
  { id: 'extract', label: '추출 (Extract)'         },
  { id: 'delete',  label: '삭제 (Delete)'          },
  { id: 'rotate',  label: '회전 (Rotate)'          },
  { id: 'reorder', label: '순서 바꾸기 (Reorder)'  },
  { id: 'encrypt',      label: '암호화 (Protect)'       },
  { id: 'image-to-pdf', label: '이미지→PDF'             },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('merge')

  return (
    <div className="mx-auto min-h-screen max-w-[800px] px-4 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-50 pb-2 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">vibe-pdf</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <Shield className="h-3.5 w-3.5" />
            파일이 내 기기를 떠나지 않아요
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="mt-4" role="tablist">
          <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Tab Content */}
      <main className="pt-6">
        {activeTab === 'merge'   && <MergePage />}
        {activeTab === 'split'   && <SplitPage />}
        {activeTab === 'extract' && <ExtractPage />}
        {activeTab === 'delete'  && <DeletePage />}
        {activeTab === 'rotate'  && <RotatePage />}
        {activeTab === 'reorder' && <ReorderPage />}
        {activeTab === 'encrypt'      && <PasswordProtectPage />}
        {activeTab === 'image-to-pdf' && <ImageToPdfPage />}
      </main>

      {/* Footer */}
      <footer className="mt-10 text-center text-xs text-gray-400">
        업로드된 파일은 이 브라우저 탭 안에서만 처리됩니다
      </footer>
    </div>
  )
}
