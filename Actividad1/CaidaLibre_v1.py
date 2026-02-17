#!/usr/bin/env python
# coding: utf-8

# La ecuación que quereemos modelar es:
# $$y=y_o+v_0t+\frac{g}{2}t^2$$

# In[100]:


import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit


# In[ ]:


y=np.array([2.3,2.2,2.1,2.0,1.9,1.8,1.7,1.6,1.5,1.4,1.3,1.2,1.1])#,1.0] m
t=np.array([0.662,0.63,0.568,0.482,0.466,0.406,0.41,0.38,0.35,0.342,0.33,0.324,0.296])#,0.265] s
plt.figure(figsize=(5,4))
plt.plot(np.array(t),np.array(y),lw=0,marker="o",label="Data")
plt.grid();plt.legend();plt.show()


# In[102]:


np.mean([65,69,61,68,68])


# In[103]:


def func(t, g):
    return (g/2)*(t**2)
#Fit for the parameters y0, v0, g of the function func:
popt, pcov = curve_fit(func, t, y)


# In[104]:


popt


# In[107]:


plt.figure(figsize=(6, 4))
plt.plot(t, func(t, *popt), 'r-', label='Ajuste: g=%5.3f m/s²' % popt[0])
plt.plot(t, y, lw=0, marker="o", label="Datos Experimentales")
plt.xlabel('Tiempo (s)')
plt.ylabel('Distancia (m)')
plt.title('Ajuste de Caída Libre')
plt.grid()
plt.legend()
plt.show()

