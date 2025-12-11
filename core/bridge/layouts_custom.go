package main

import (
	"fyne.io/fyne/v2"
)

// ============================================================================
// Custom Layouts with Configurable Spacing
// These allow per-widget spacing overrides instead of relying on theme.Padding()
// ============================================================================

// SpacedVBoxLayout is a vertical box layout with configurable spacing
type SpacedVBoxLayout struct {
	Spacing float32
}

func NewSpacedVBoxLayout(spacing float32) *SpacedVBoxLayout {
	return &SpacedVBoxLayout{Spacing: spacing}
}

func (l *SpacedVBoxLayout) Layout(objects []fyne.CanvasObject, size fyne.Size) {
	y := float32(0)
	for i, child := range objects {
		if !child.Visible() {
			continue
		}
		childMin := child.MinSize()
		child.Move(fyne.NewPos(0, y))
		child.Resize(fyne.NewSize(size.Width, childMin.Height))
		y += childMin.Height
		if i < len(objects)-1 {
			y += l.Spacing
		}
	}
}

func (l *SpacedVBoxLayout) MinSize(objects []fyne.CanvasObject) fyne.Size {
	minWidth := float32(0)
	minHeight := float32(0)
	visibleCount := 0

	for _, child := range objects {
		if !child.Visible() {
			continue
		}
		childMin := child.MinSize()
		if childMin.Width > minWidth {
			minWidth = childMin.Width
		}
		minHeight += childMin.Height
		visibleCount++
	}

	if visibleCount > 1 {
		minHeight += l.Spacing * float32(visibleCount-1)
	}

	return fyne.NewSize(minWidth, minHeight)
}

// SpacedHBoxLayout is a horizontal box layout with configurable spacing
type SpacedHBoxLayout struct {
	Spacing float32
}

func NewSpacedHBoxLayout(spacing float32) *SpacedHBoxLayout {
	return &SpacedHBoxLayout{Spacing: spacing}
}

func (l *SpacedHBoxLayout) Layout(objects []fyne.CanvasObject, size fyne.Size) {
	x := float32(0)
	for i, child := range objects {
		if !child.Visible() {
			continue
		}
		childMin := child.MinSize()
		child.Move(fyne.NewPos(x, 0))
		child.Resize(fyne.NewSize(childMin.Width, size.Height))
		x += childMin.Width
		if i < len(objects)-1 {
			x += l.Spacing
		}
	}
}

func (l *SpacedHBoxLayout) MinSize(objects []fyne.CanvasObject) fyne.Size {
	minWidth := float32(0)
	minHeight := float32(0)
	visibleCount := 0

	for _, child := range objects {
		if !child.Visible() {
			continue
		}
		childMin := child.MinSize()
		minWidth += childMin.Width
		if childMin.Height > minHeight {
			minHeight = childMin.Height
		}
		visibleCount++
	}

	if visibleCount > 1 {
		minWidth += l.Spacing * float32(visibleCount-1)
	}

	return fyne.NewSize(minWidth, minHeight)
}

// SpacedGridLayout is a grid layout with configurable spacing
type SpacedGridLayout struct {
	Columns  int
	Spacing  float32
	CellSize float32 // If > 0, use fixed cell size instead of dividing space
}

func NewSpacedGridLayout(columns int, spacing float32) *SpacedGridLayout {
	return &SpacedGridLayout{Columns: columns, Spacing: spacing}
}

func NewFixedCellGridLayout(columns int, cellSize float32, spacing float32) *SpacedGridLayout {
	return &SpacedGridLayout{Columns: columns, Spacing: spacing, CellSize: cellSize}
}

func (l *SpacedGridLayout) Layout(objects []fyne.CanvasObject, size fyne.Size) {
	if l.Columns <= 0 || len(objects) == 0 {
		return
	}

	rows := (len(objects) + l.Columns - 1) / l.Columns

	var cellWidth, cellHeight float32
	if l.CellSize > 0 {
		// Fixed cell size mode
		cellWidth = l.CellSize
		cellHeight = l.CellSize
	} else {
		// Calculate cell size by dividing available space
		totalHSpacing := l.Spacing * float32(l.Columns-1)
		totalVSpacing := l.Spacing * float32(rows-1)
		cellWidth = (size.Width - totalHSpacing) / float32(l.Columns)
		cellHeight = (size.Height - totalVSpacing) / float32(rows)
	}

	col := 0
	row := 0
	for _, child := range objects {
		if !child.Visible() {
			continue
		}

		x := float32(col) * (cellWidth + l.Spacing)
		y := float32(row) * (cellHeight + l.Spacing)

		child.Move(fyne.NewPos(x, y))
		child.Resize(fyne.NewSize(cellWidth, cellHeight))

		col++
		if col >= l.Columns {
			col = 0
			row++
		}
	}
}

func (l *SpacedGridLayout) MinSize(objects []fyne.CanvasObject) fyne.Size {
	if l.Columns <= 0 || len(objects) == 0 {
		return fyne.NewSize(0, 0)
	}

	visibleCount := 0
	for _, child := range objects {
		if child.Visible() {
			visibleCount++
		}
	}

	if visibleCount == 0 {
		return fyne.NewSize(0, 0)
	}

	rows := (visibleCount + l.Columns - 1) / l.Columns

	if l.CellSize > 0 {
		// Fixed cell size mode - use specified size
		totalWidth := l.CellSize*float32(l.Columns) + l.Spacing*float32(l.Columns-1)
		totalHeight := l.CellSize*float32(rows) + l.Spacing*float32(rows-1)
		return fyne.NewSize(totalWidth, totalHeight)
	}

	// Find the maximum cell size needed from children
	maxCellWidth := float32(0)
	maxCellHeight := float32(0)

	for _, child := range objects {
		if !child.Visible() {
			continue
		}
		childMin := child.MinSize()
		if childMin.Width > maxCellWidth {
			maxCellWidth = childMin.Width
		}
		if childMin.Height > maxCellHeight {
			maxCellHeight = childMin.Height
		}
	}

	totalWidth := maxCellWidth*float32(l.Columns) + l.Spacing*float32(l.Columns-1)
	totalHeight := maxCellHeight*float32(rows) + l.Spacing*float32(rows-1)

	return fyne.NewSize(totalWidth, totalHeight)
}

// ============================================================================
// Custom Padded Layout with Individual Padding Values
// ============================================================================

// CustomPaddedLayout wraps content with configurable padding on each side
type CustomPaddedLayout struct {
	Top    float32
	Right  float32
	Bottom float32
	Left   float32
}

// NewCustomPaddedLayout creates a layout with individual padding values
func NewCustomPaddedLayout(top, right, bottom, left float32) *CustomPaddedLayout {
	return &CustomPaddedLayout{Top: top, Right: right, Bottom: bottom, Left: left}
}

// NewUniformPaddedLayout creates a layout with the same padding on all sides
func NewUniformPaddedLayout(padding float32) *CustomPaddedLayout {
	return &CustomPaddedLayout{Top: padding, Right: padding, Bottom: padding, Left: padding}
}

func (l *CustomPaddedLayout) Layout(objects []fyne.CanvasObject, size fyne.Size) {
	for _, child := range objects {
		if !child.Visible() {
			continue
		}
		child.Move(fyne.NewPos(l.Left, l.Top))
		child.Resize(fyne.NewSize(
			size.Width-l.Left-l.Right,
			size.Height-l.Top-l.Bottom,
		))
	}
}

func (l *CustomPaddedLayout) MinSize(objects []fyne.CanvasObject) fyne.Size {
	minWidth := l.Left + l.Right
	minHeight := l.Top + l.Bottom

	for _, child := range objects {
		if !child.Visible() {
			continue
		}
		childMin := child.MinSize()
		minWidth += childMin.Width
		minHeight += childMin.Height
		break // Only first child matters for padded layout
	}

	return fyne.NewSize(minWidth, minHeight)
}
