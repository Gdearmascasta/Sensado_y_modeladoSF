import json
import os

filepath = '/Users/apple/Desktop/Universidad/Sensado y Sistemas Fisicos/Sensado_y_modeladoSF/03_coefficient_restitution/restitution_calculator.ipynb'

with open(filepath, 'r') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        source = "".join(cell['source'])
        
        # 1. Update Tracking to be silent
        source = source.replace('cv2.imshow("Procesando Tracking", vis)', '# cv2.imshow')
        source = source.replace('cv2.waitKey(1)', '# cv2.waitKey')
        source = source.replace('cv2.destroyAllWindows()', '# cv2.destroyAllWindows()')
        
        # 2. Update __file__ references
        source = source.replace('os.path.dirname(os.path.abspath(__file__))', 'os.getcwd()')
        
        # 3. Disable interactive calibration in main cell
        old_call = 'lower_hsv, upper_hsv = interactive_hsv_calibration(video_path)'
        new_call = "lower_hsv = np.array([0, 100, 100])\n        upper_hsv = np.array([10, 255, 255])\n        # " + old_call
        source = source.replace(old_call, new_call)
        
        # Ensure interactive_hsv_calibration doesn't stay open if it somehow executes
        source = source.replace('cv2.imshow("Ajuste HSV", combined)', '# cv2.imshow("Ajuste HSV", combined)')
        
        # Format back into list of strings as Jupyter expects
        lines = [line + '\n' for line in source.split('\n')]
        # Drop the last newline to keep exact formatting if it was empty
        if len(lines) > 0 and lines[-1] == '\n':
            lines[-1] = ''
            
        cell['source'] = [line for line in lines if line]

with open(filepath, 'w') as f:
    json.dump(nb, f, indent=1)
print("Notebook parched successfully!")
