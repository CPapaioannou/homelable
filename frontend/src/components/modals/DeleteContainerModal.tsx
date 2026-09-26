import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteContainerModalProps {
  open: boolean
  label: string
  descendantCount: number
  onContainerOnly: () => void
  onSubtree: () => void
  onCancel: () => void
}

export function DeleteContainerModal({
  open,
  label,
  descendantCount,
  onContainerOnly,
  onSubtree,
  onCancel,
}: DeleteContainerModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#f85149]" />
            Delete nonempty container
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{label}</span> contains {descendantCount}{' '}
            unselected descendant{descendantCount === 1 ? '' : 's'}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onContainerOnly}>Delete container only</Button>
            <Button variant="destructive" size="sm" onClick={onSubtree}>Delete entire subtree</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
