BUG report

- flip horizontal => points and other ui components dont account for it
- flip vertical => points and other ui component dont account for it

when we draw points in a poly line or pen tool line we need to account for transformations like flip and rotate to draw the point selector boxes in the correct location.